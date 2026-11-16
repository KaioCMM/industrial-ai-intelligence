import "server-only";
import type { ReasoningEffort } from "openai/resources/shared";

// Cada papel tem um modelo, e todos podem ser trocados por variável de ambiente.
// Padrão: família GPT-6, a atual da OpenAI (a gpt-4.1-nano foi aposentada em 2026,
// e é por isso que o modelo nunca fica fixo no código).
export const MODELOS = {
  leve: process.env.MODELO_LEVE ?? "gpt-6-luna",
  medio: process.env.MODELO_MEDIO ?? "gpt-6.1-terra",
  forte: process.env.MODELO_FORTE ?? "gpt-6.1-sol",
  embedding: process.env.MODELO_EMBEDDING ?? "text-embedding-3-small",
  rerank: process.env.MODELO_RERANK ?? "gpt-6-luna",
  // O juiz é outro modelo, mais forte que o que responde: o mesmo modelo
  // tenderia a dar nota alta ao próprio estilo de resposta.
  juiz: process.env.MODELO_JUIZ ?? "gpt-6.1-sol",
} as const;

/**
 * Esforço de raciocínio por tarefa. Os modelos GPT-6 raciocinam em "medium" por
 * padrão: mais lento e mais caro, porque os tokens de raciocínio são cobrados como saída.
 * Classificar, reordenar e responder com o contexto pronto não precisa pensar;
 * o juiz e as perguntas complexas ganham um pouco de raciocínio.
 * O gpt-6.1-sol não aceita "none", então "low" é o mínimo dele.
 */
export const RACIOCINIO: Record<"rapido" | "analise", ReasoningEffort> = {
  rapido: "none",
  analise: "low",
};

/** Precisa bater com a coluna vector(1536) do Supabase. */
export const DIMENSAO_EMBEDDING = 1536;

/** Acima deste gasto no dia, o cliente recusa novas chamadas antes de chegar à OpenAI. */
export const TETO_DIARIO_USD = Number(process.env.TETO_DIARIO_USD ?? "2");
