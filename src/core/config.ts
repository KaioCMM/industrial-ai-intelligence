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

export interface ParametrosChamada {
  /** Nome da etapa como aparece na tela de parâmetros. */
  etapa: string;
  modelo: string;
  temperatura: number;
  raciocinio: ReasoningEffort;
  maxTokens: number;
  /** Resposta presa a um JSON Schema (rótulo, nota), em vez de texto livre. */
  estruturada: boolean;
  porque: string;
}

/**
 * Registro único dos parâmetros de cada chamada ao modelo. Os módulos leem daqui,
 * e a tela "Parâmetros dos modelos" mostra exatamente estes valores, então ela nunca
 * fica diferente do código.
 *
 * Raciocínio: os GPT-6 raciocinam em "medium" por padrão, o que deixa a resposta mais
 * lenta e mais cara (os tokens de raciocínio são cobrados como saída). Classificar,
 * reordenar e responder com o contexto pronto não precisa pensar; o juiz e as perguntas
 * complexas ganham "low".
 * Temperatura: nos GPT-6 ela só vale com raciocínio "none" (ver regras-modelo.ts).
 */
export const PARAMETROS = {
  classificador: {
    etapa: "Classificador do roteamento",
    modelo: MODELOS.leve,
    temperatura: 0,
    raciocinio: "none",
    maxTokens: 200,
    estruturada: true,
    porque: "A mesma pergunta precisa cair sempre na mesma faixa.",
  },
  rerank: {
    etapa: "Reranking",
    modelo: MODELOS.rerank,
    temperatura: 0,
    raciocinio: "none",
    maxTokens: 600,
    estruturada: true,
    porque: "O mesmo trecho precisa receber a mesma nota para a mesma pergunta.",
  },
  respostaRag: {
    etapa: "Resposta do RAG",
    modelo: MODELOS.medio,
    temperatura: 0.2,
    raciocinio: "none",
    maxTokens: 1000,
    estruturada: false,
    porque: "Texto natural, mas preso aos trechos: pouca variação reduz o risco de inventar.",
  },
  agente: {
    etapa: "Agente (function calling)",
    modelo: MODELOS.medio,
    temperatura: 0.1,
    raciocinio: "none",
    maxTokens: 1200,
    estruturada: false,
    porque: "Escolher funções e argumentos de forma consistente; os argumentos já são validados pelo schema estrito.",
  },
  roteadaSimples: {
    etapa: "Resposta roteada: simples",
    modelo: MODELOS.leve,
    temperatura: 0.3,
    raciocinio: "none",
    maxTokens: 1200,
    estruturada: false,
    porque: "Explicação curta com um pouco de liberdade de redação.",
  },
  roteadaModerada: {
    etapa: "Resposta roteada: moderada",
    modelo: MODELOS.medio,
    temperatura: 0.3,
    raciocinio: "none",
    maxTokens: 1200,
    estruturada: false,
    porque: "Explicação mais longa com um pouco de liberdade de redação.",
  },
  roteadaComplexa: {
    etapa: "Resposta roteada: complexa",
    modelo: MODELOS.forte,
    temperatura: 0.3,
    raciocinio: "low",
    maxTokens: 4000,
    estruturada: false,
    porque: "Plano e análise pedem raciocínio; o limite de tokens cresce para caber ele.",
  },
  juiz: {
    etapa: "Juiz (LLM-as-a-Judge)",
    modelo: MODELOS.juiz,
    temperatura: 0,
    raciocinio: "low",
    maxTokens: 2500,
    estruturada: true,
    porque: "Comparar afirmação por afirmação com o contexto pede raciocínio; a rubrica e o schema seguram a consistência.",
  },
} satisfies Record<string, ParametrosChamada>;

/** Papel de cada chamada no registro de parâmetros. */
export type PapelChamada = keyof typeof PARAMETROS;

/** Precisa bater com a coluna vector(1536) do Supabase. */
export const DIMENSAO_EMBEDDING = 1536;

/** Acima deste gasto no dia, o cliente recusa novas chamadas antes de chegar à OpenAI. */
export const TETO_DIARIO_USD = Number(process.env.TETO_DIARIO_USD ?? "2");
