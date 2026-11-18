import "server-only";
import { PARAMETROS } from "@/core/config";
import { chatJson } from "@/core/llm";
import { obterSupabase, supabaseConfigurado } from "@/core/supabase";
import type { Rastro } from "@/core/tipos";
import type { Julgamento } from "./tipos";

// LLM-as-a-Judge com rubrica obrigatória.
//
// Sem rubrica, "dê uma nota de 1 a 5" vira opinião do modelo e varia a cada
// execução. Com critérios separados e âncoras para cada nota, a nota passa a
// medir uma coisa definida e duas execuções ficam comparáveis.
// A justificativa vem ANTES das notas no schema: o modelo escreve o raciocínio
// e só depois decide o número, em vez de inventar uma explicação para um número já dado.
// Temperatura 0 só vale nos modelos que aceitam: o juiz padrão (gpt-6.1-sol) raciocina e
// roda com a temperatura padrão, 1. Nele, a consistência vem da rubrica e do schema.
// Raciocínio "low": o juiz compara afirmação por afirmação com o contexto, e um pouco de raciocínio ajuda nisso.

const RUBRICA = `Avalie a RESPOSTA de um assistente de gestão de projetos de capital segundo três critérios, cada um de 1 a 5.

FIDELIDADE: toda afirmação da resposta está sustentada pelo CONTEXTO?
5 = tudo sustentado; 3 = há detalhe sem apoio no contexto; 1 = inventa fatos ou contradiz o contexto.
Se o contexto não cobre a pergunta e a resposta diz isso, a fidelidade é 5.

RELEVÂNCIA: a resposta trata do que foi perguntado?
5 = responde direto; 3 = responde com desvios; 1 = não responde.

COMPLETUDE: a resposta cobre os pontos essenciais da REFERÊNCIA (o gabarito)?
5 = todos os pontos; 3 = metade; 1 = nenhum. Sem referência, compare com o que o contexto permitia responder.

Escreva primeiro uma justificativa curta (até 3 frases) e depois as notas.`;

export async function julgar(
  entrada: { pergunta: string; contexto: string; resposta: string; referencia?: string },
  rastro: Rastro,
): Promise<Julgamento> {
  const saida = await chatJson<Omit<Julgamento, "nota" | "modeloJuiz">>(
    {
      modelo: PARAMETROS.juiz.modelo,
      sistema: RUBRICA,
      usuario: [
        `PERGUNTA:\n${entrada.pergunta}`,
        `CONTEXTO:\n${entrada.contexto || "(vazio)"}`,
        `REFERÊNCIA:\n${entrada.referencia ?? "(sem referência)"}`,
        `RESPOSTA:\n${entrada.resposta}`,
      ].join("\n\n"),
      nomeSchema: "julgamento",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["justificativa", "fidelidade", "relevancia", "completude"],
        properties: {
          justificativa: { type: "string" },
          fidelidade: { type: "integer", enum: [1, 2, 3, 4, 5] },
          relevancia: { type: "integer", enum: [1, 2, 3, 4, 5] },
          completude: { type: "integer", enum: [1, 2, 3, 4, 5] },
        },
      },
      temperatura: PARAMETROS.juiz.temperatura,
      raciocinio: PARAMETROS.juiz.raciocinio,
      maxTokens: PARAMETROS.juiz.maxTokens,
    },
    rastro,
    "juiz",
  );
  const nota = Math.round(((saida.fidelidade + saida.relevancia + saida.completude) / 3) * 100) / 100;
  return { ...saida, nota, modeloJuiz: PARAMETROS.juiz.modelo };
}

export async function salvarJulgamento(dados: {
  julgamento: Julgamento;
  origem: "avaliacao" | "online";
  configuracao: string;
  pergunta: string;
  resposta: string;
  referencia?: string;
  execucaoId?: string;
  casoId?: string;
  custoUsd: number;
  latenciaMs: number;
}) {
  if (!supabaseConfigurado()) return;
  const { error } = await obterSupabase().from("julgamentos").insert({
    execucao_id: dados.execucaoId ?? null,
    origem: dados.origem,
    configuracao: dados.configuracao,
    caso_id: dados.casoId ?? null,
    pergunta: dados.pergunta,
    resposta: dados.resposta,
    referencia: dados.referencia ?? null,
    fidelidade: dados.julgamento.fidelidade,
    relevancia: dados.julgamento.relevancia,
    completude: dados.julgamento.completude,
    nota: dados.julgamento.nota,
    justificativa: dados.julgamento.justificativa,
    modelo_juiz: dados.julgamento.modeloJuiz,
    custo_usd: dados.custoUsd,
    latencia_ms: Math.round(dados.latenciaMs),
  });
  if (error) console.warn(JSON.stringify({ evento: "julgamento.falhou", erro: error.message }));
}

export function descreverConfiguracao(modo: string, reranquear: boolean) {
  return `${modo}${reranquear ? " + rerank" : ""}`;
}
