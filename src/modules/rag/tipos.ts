// Contratos do módulo RAG, usados pela rota e pela página.
import type { ResumoRastro } from "@/core/tipos";
import type { Julgamento } from "@/modules/avaliacao/tipos";

export type ModoBusca = "vetorial" | "lexical" | "hibrida";

/** Filtro de coleção vindo da tela: "todas" vira null na busca. */
export type FiltroColecao = "todas" | "projeto" | "normas" | "conceitos";

export interface Trecho {
  id: number;
  colecao: string;
  fonte: string;
  titulo: string;
  conteudo: string;
  score: number;
  /** Só na híbrida: posição do trecho em cada lista antes da fusão (null = não apareceu). */
  rankLexical?: number | null;
  rankVetorial?: number | null;
}

export interface TrechoReranqueado extends Trecho {
  notaRerank: number;
  posicaoOriginal: number;
}

export interface RespostaRag {
  modo: ModoBusca;
  colecao: FiltroColecao;
  reranqueado: boolean;
  comparacao: Record<ModoBusca, Trecho[]>;
  candidatos: Trecho[];
  reranking: TrechoReranqueado[] | null;
  contexto: Trecho[];
  resposta: string;
  julgamento: Julgamento | null;
  tempos: { buscaMs: number; rerankMs: number; geracaoMs: number; juizMs: number };
  resumo: ResumoRastro;
}

export interface EstadoBase {
  configurado: boolean;
  trechos: number;
  documentos: number;
  documentosNoCorpus: number;
  porColecao: Record<string, number>;
}
