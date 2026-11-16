import "server-only";
import { MODELOS, RACIOCINIO } from "@/core/config";
import { chat } from "@/core/llm";
import type { Rastro } from "@/core/tipos";
import { buscar, buscarNosTresModos } from "./busca";
import type { Colecao } from "./corpus";
import { reranquear } from "./rerank";
import type { FiltroColecao, ModoBusca, Trecho, TrechoReranqueado } from "./tipos";

export const CANDIDATOS = 8;
export const CONTEXTO_FINAL = 4;

const SISTEMA_RESPOSTA = `Você é o assistente da gerenciadora do Projeto Linha 3, uma obra de expansão industrial.
Responda em português, de forma direta, usando SOMENTE as informações dos trechos fornecidos.
Cite a fonte de cada afirmação com o número do trecho entre colchetes, como [1] ou [2]. Quando o trecho for de uma NR, cite também o número do item.
Se os trechos não contêm a resposta, diga exatamente que a documentação disponível não cobre esse assunto. Não complete com conhecimento geral.`;

export async function gerarResposta(pergunta: string, contexto: Trecho[], rastro: Rastro): Promise<string> {
  const trechos = contexto
    .map((t, i) => `[${i + 1}] ${t.fonte}: ${t.titulo}\n${t.conteudo}`)
    .join("\n\n");
  const resposta = await chat(
    {
      model: MODELOS.medio,
      messages: [
        { role: "system", content: SISTEMA_RESPOSTA },
        { role: "user", content: `Trechos:\n${trechos}\n\nPergunta: ${pergunta}` },
      ],
      temperatura: 0.2,
      raciocinio: RACIOCINIO.rapido,
      max_completion_tokens: 1000,
    },
    rastro,
    "resposta-rag",
  );
  return resposta.choices[0]?.message.content?.trim() ?? "";
}

export interface ResultadoPipeline {
  comparacao: Record<ModoBusca, Trecho[]> | null;
  candidatos: Trecho[];
  reranking: TrechoReranqueado[] | null;
  contexto: Trecho[];
  resposta: string;
  tempos: { buscaMs: number; rerankMs: number; geracaoMs: number };
}

/**
 * Busca → (reranking) → geração. Com `comparar`, roda os três modos de busca
 * para a página mostrar a diferença; sem ele (avaliação), roda só o modo escolhido.
 */
export async function executarRag(
  opcoes: { pergunta: string; modo: ModoBusca; reranquear: boolean; comparar: boolean; colecao?: FiltroColecao },
  rastro: Rastro,
): Promise<ResultadoPipeline> {
  const colecao: Colecao | null = !opcoes.colecao || opcoes.colecao === "todas" ? null : opcoes.colecao;

  let t = performance.now();
  let comparacao: Record<ModoBusca, Trecho[]> | null = null;
  let candidatos: Trecho[];
  if (opcoes.comparar) {
    comparacao = await buscarNosTresModos(opcoes.pergunta, CANDIDATOS, rastro, colecao);
    candidatos = comparacao[opcoes.modo];
  } else {
    candidatos = await buscar(opcoes.pergunta, opcoes.modo, CANDIDATOS, rastro, colecao);
  }
  const buscaMs = performance.now() - t;

  t = performance.now();
  const reranking = opcoes.reranquear ? await reranquear(opcoes.pergunta, candidatos, CONTEXTO_FINAL, rastro) : null;
  const rerankMs = performance.now() - t;
  const contexto = reranking ?? candidatos.slice(0, CONTEXTO_FINAL);

  t = performance.now();
  const resposta = await gerarResposta(opcoes.pergunta, contexto, rastro);
  const geracaoMs = performance.now() - t;

  return { comparacao, candidatos, reranking, contexto, resposta, tempos: { buscaMs, rerankMs, geracaoMs } };
}
