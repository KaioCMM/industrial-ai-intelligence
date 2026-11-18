import "server-only";
import type { ChatCompletionMessageParam, ChatCompletionToolMessageParam } from "openai/resources/chat/completions";
import { PARAMETROS } from "@/core/config";
import { chat } from "@/core/llm";
import type { Rastro } from "@/core/tipos";
import { buscar } from "@/modules/rag/busca";
import type { Colecao } from "@/modules/rag/corpus";
import { FERRAMENTAS } from "./definicoes";
import {
  ATIVIDADES,
  BAC_MILHOES,
  CONTINGENCIA_MILHOES,
  DATA_DE_CORTE,
  MARCOS,
  RISCOS,
  indicadoresDoMes,
  registrarPedidoMudanca,
  simularAtraso,
} from "./projeto";
import type { PassoAgente } from "./tipos";

// Function Calling: o modelo decide quais funções chamar e com quais
// argumentos; o CÓDIGO executa e devolve o resultado. O modelo nunca toca o
// sistema direto. Isso troca "o modelo acha que o projeto está atrasado" por
// "o modelo leu SPI 0,897 do controle de custos e a folga da atividade no cronograma".
//
// Laço de no máximo 6 rodadas: impede que o agente fique chamando
// ferramentas para sempre e põe um teto no custo de cada pergunta.

const MAX_RODADAS = 6;

const SISTEMA = `Você é o assistente da gerenciadora do Projeto Linha 3 (expansão de uma planta de pelotização) e tem ferramentas que leem o cronograma, o controle de custos, o registro de riscos e a documentação.
Regras:
- Use as ferramentas para obter dados; nunca invente datas, percentuais ou valores.
- Índices de valor agregado (SPI, CPI, EAC) sempre pela função indicadores_valor_agregado; impacto de atraso sempre por simular_atraso.
- Para procedimentos, lições aprendidas e normas, consulte a documentação antes de concluir.
- Só registre pedido de mudança se o usuário pedir.
- Responda em português, de forma objetiva, citando os números lidos e de onde vieram. Valores em milhões de reais.`;

async function executarFerramenta(nome: string, args: Record<string, unknown>, rastro: Rastro): Promise<unknown> {
  switch (nome) {
    case "resumo_projeto":
      return { data_de_corte: DATA_DE_CORTE, orcamento_bac_milhoes: BAC_MILHOES, contingencia_milhoes: CONTINGENCIA_MILHOES, marcos: MARCOS };
    case "listar_atividades": {
      const filtro = String(args.filtro);
      const lista =
        filtro === "criticas"
          ? ATIVIDADES.filter((a) => a.critica)
          : filtro === "atrasadas"
            ? ATIVIDADES.filter((a) => a.avancoReal < a.avancoPlanejado)
            : ATIVIDADES;
      return lista.map((a) => ({ ...a, desvio_pontos: a.avancoReal - a.avancoPlanejado }));
    }
    case "indicadores_valor_agregado":
      return indicadoresDoMes(String(args.mes));
    case "simular_atraso":
      return simularAtraso(String(args.atividade_id), Math.max(0, Math.round(Number(args.dias) || 0)));
    case "listar_riscos": {
      const minimo = Number(args.severidade_minima) || 1;
      return RISCOS.filter((r) => r.severidade >= minimo).sort((a, b) => b.severidade - a.severidade);
    }
    case "buscar_documentacao": {
      const colecao = args.colecao === "todas" ? null : (String(args.colecao) as Colecao);
      const trechos = await buscar(String(args.consulta ?? ""), "hibrida", 4, rastro, colecao);
      return trechos.map((t) => ({ fonte: t.fonte, titulo: t.titulo, conteudo: t.conteudo }));
    }
    case "registrar_pedido_mudanca":
      return registrarPedidoMudanca(
        String(args.titulo),
        String(args.justificativa),
        Number(args.impacto_custo_milhoes) || 0,
        Math.round(Number(args.impacto_prazo_dias) || 0),
      );
    default:
      throw new Error(`Ferramenta desconhecida: ${nome}`);
  }
}

export async function executarAgente(pergunta: string, rastro: Rastro) {
  const mensagens: ChatCompletionMessageParam[] = [
    { role: "system", content: SISTEMA },
    { role: "user", content: pergunta },
  ];
  const passos: PassoAgente[] = [];

  for (let rodada = 1; rodada <= MAX_RODADAS; rodada++) {
    const ultimaRodada = rodada === MAX_RODADAS;
    const resposta = await chat(
      {
        model: PARAMETROS.agente.modelo,
        messages: mensagens,
        tools: FERRAMENTAS,
        // Na última rodada o modelo é obrigado a responder com o que já tem.
        tool_choice: ultimaRodada ? "none" : "auto",
        temperatura: PARAMETROS.agente.temperatura,
        raciocinio: PARAMETROS.agente.raciocinio,
        max_completion_tokens: PARAMETROS.agente.maxTokens,
      },
      rastro,
      "agente-rodada",
    );
    const mensagem = resposta.choices[0]?.message;
    const chamadas = (mensagem?.tool_calls ?? []).filter((c) => c.type === "function");

    if (!mensagem || chamadas.length === 0) {
      return { passos, rodadas: rodada, resposta: mensagem?.content?.trim() ?? "" };
    }

    mensagens.push({ role: "assistant", content: mensagem.content, tool_calls: chamadas });

    // Chamadas da mesma rodada são independentes entre si: rodam em paralelo.
    const resultados = await Promise.all(
      chamadas.map(async (chamada) => {
        const inicio = performance.now();
        let argumentos: Record<string, unknown> = {};
        let resultado: unknown;
        let ok = true;
        try {
          argumentos = JSON.parse(chamada.function.arguments || "{}");
          resultado = await executarFerramenta(chamada.function.name, argumentos, rastro);
        } catch (e) {
          // O erro volta para o modelo como resultado: ele pode corrigir o argumento na próxima rodada.
          ok = false;
          resultado = { erro: e instanceof Error ? e.message : String(e) };
        }
        const passo: PassoAgente = {
          rodada,
          ferramenta: chamada.function.name,
          argumentos,
          resultado,
          ok,
          duracaoMs: performance.now() - inicio,
        };
        const mensagemFerramenta: ChatCompletionToolMessageParam = {
          role: "tool",
          tool_call_id: chamada.id,
          content: JSON.stringify(resultado),
        };
        return { passo, mensagemFerramenta };
      }),
    );

    for (const r of resultados) {
      passos.push(r.passo);
      mensagens.push(r.mensagemFerramenta);
    }
  }

  return { passos, rodadas: MAX_RODADAS, resposta: "O agente atingiu o limite de rodadas sem concluir." };
}
