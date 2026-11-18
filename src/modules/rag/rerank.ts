import "server-only";
import { PARAMETROS } from "@/core/config";
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
// O modelo leve dá nota de 0 a 10 a todos os candidatos numa chamada, a um custo
// abaixo de um décimo de centavo de dólar.
//
// Cada trecho vai cortado nos primeiros 700 caracteres: para julgar se o trecho
// responde, o começo basta (o item da NR, o assunto do parágrafo). Com isso cabem
// 12 candidatos no mesmo volume de tokens que 8 trechos inteiros ocupavam: mais
// chance de o documento certo chegar ao contexto, sem deixar o reranking mais lento.
const LIMITE_POR_TRECHO = 700;

interface SaidaRerank {
  notas: number[];
}

export async function reranquear(
  pergunta: string,
  candidatos: Trecho[],
  quantidadeFinal: number,
  rastro: Rastro,
): Promise<TrechoReranqueado[]> {
  if (candidatos.length === 0) return [];

  // Trechos numerados de 1 a N; o modelo devolve só a lista de notas, na mesma ordem.
  // Antes eram objetos {id, nota}: ~110 tokens de saída para 12 trechos. Escrever é a
  // parte lenta da chamada, e a lista simples tem menos da metade dos tokens.
  const lista = candidatos
    .map((t, i) => {
      const texto = t.conteudo.length > LIMITE_POR_TRECHO ? `${t.conteudo.slice(0, LIMITE_POR_TRECHO)}…` : t.conteudo;
      return `<trecho n="${i + 1}">\n${t.fonte}: ${t.titulo}\n${texto}\n</trecho>`;
    })
    .join("\n\n");

  const saida = await chatJson<SaidaRerank>(
    {
      modelo: PARAMETROS.rerank.modelo,
      sistema:
        "Você avalia trechos de documentação técnica pela utilidade para responder a uma pergunta. " +
        "Dê a cada trecho uma nota inteira de 0 a 10: 10 = contém a resposta direta; 5 = assunto relacionado sem a resposta; 0 = irrelevante. " +
        `Devolva exatamente ${candidatos.length} notas, na ordem dos trechos (do n="1" ao n="${candidatos.length}").`,
      usuario: `Pergunta: ${pergunta}\n\n${lista}`,
      nomeSchema: "rerank",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["notas"],
        properties: {
          notas: { type: "array", items: { type: "integer", minimum: 0, maximum: 10 } },
        },
      },
      temperatura: PARAMETROS.rerank.temperatura,
      raciocinio: PARAMETROS.rerank.raciocinio,
      maxTokens: PARAMETROS.rerank.maxTokens,
    },
    rastro,
    "rerank",
  );

  // Se o modelo devolver menos notas que trechos, os que faltam ficam com 0 e mantêm a ordem da busca no desempate.
  return candidatos
    .map((t, i) => ({ ...t, notaRerank: saida.notas[i] ?? 0, posicaoOriginal: i + 1 }))
    .sort((a, b) => b.notaRerank - a.notaRerank || a.posicaoOriginal - b.posicaoOriginal)
    .slice(0, quantidadeFinal);
}
