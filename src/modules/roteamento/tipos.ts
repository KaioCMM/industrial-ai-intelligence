import type { ResumoRastro } from "@/core/tipos";

export type Complexidade = "simples" | "moderada" | "complexa";

export interface DecisaoRota {
  complexidade: Complexidade;
  motivo: string;
}

export interface RespostaRoteamento {
  decisao: DecisaoRota;
  modelo: string;
  mapa: Record<Complexidade, string>;
  resposta: string;
  /** O que esta requisição custou de verdade, incluindo a chamada do classificador. */
  custoRealUsd: number;
  /** Estimativa: os mesmos tokens da resposta, cobrados ao preço do modelo forte. */
  custoSemRoteamentoUsd: number;
  resumo: ResumoRastro;
}
