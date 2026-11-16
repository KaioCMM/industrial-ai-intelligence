import "server-only";
import { MODELOS, RACIOCINIO } from "@/core/config";
import { chatJson } from "@/core/llm";
import type { Rastro } from "@/core/tipos";
import type { Trecho, TrechoReranqueado } from "./tipos";

// Reranking com LLM, numa chamada só para todos os candidatos (listwise).
//
// Por quê: a busca compara a pergunta e o trecho como vetores separados
// (bi-encoder). O reranker lê os dois juntos e julga se o trecho RESPONDE à
// pergunta, não só se fala do mesmo assunto.
// Descartado: um reranker dedicado (Cohere, cross-encoder próprio). Seria
// mais uma chave, mais um fornecedor e mais uma conta para apresentar.
// O modelo leve dá conta de dar nota de 0 a 10 para 8 trechos, a um custo
// abaixo de um décimo de centavo de dólar.

interface SaidaRerank {
  avaliacoes: { id: number; nota: number }[];
}

export async function reranquear(
  pergunta: string,
  candidatos: Trecho[],
  quantidadeFinal: number,
  rastro: Rastro,
): Promise<TrechoReranqueado[]> {
  if (candidatos.length === 0) return [];

  const lista = candidatos
    .map((t) => `<trecho id="${t.id}">\n${t.titulo}\n${t.conteudo}\n</trecho>`)
    .join("\n\n");

  const saida = await chatJson<SaidaRerank>(
    {
      modelo: MODELOS.rerank,
      sistema:
        "Você ordena trechos de documentação técnica por utilidade para responder a uma pergunta. " +
        "Dê a cada trecho uma nota de 0 a 10: 10 = contém a resposta direta; 5 = assunto relacionado sem a resposta; 0 = irrelevante. " +
        "Avalie todos os trechos recebidos, usando o id exato de cada um.",
      usuario: `Pergunta: ${pergunta}\n\n${lista}`,
      nomeSchema: "rerank",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["avaliacoes"],
        properties: {
          avaliacoes: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "nota"],
              properties: { id: { type: "integer" }, nota: { type: "number" } },
            },
          },
        },
      },
      temperatura: 0,
      raciocinio: RACIOCINIO.rapido,
    },
    rastro,
    "rerank",
  );

  const notas = new Map(saida.avaliacoes.map((a) => [a.id, a.nota]));
  return candidatos
    .map((t, i) => ({ ...t, notaRerank: notas.get(t.id) ?? 0, posicaoOriginal: i + 1 }))
    .sort((a, b) => b.notaRerank - a.notaRerank || a.posicaoOriginal - b.posicaoOriginal)
    .slice(0, quantidadeFinal);
}
