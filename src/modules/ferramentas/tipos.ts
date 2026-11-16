import type { ResumoRastro } from "@/core/tipos";

export interface PassoAgente {
  rodada: number;
  ferramenta: string;
  argumentos: Record<string, unknown>;
  resultado: unknown;
  ok: boolean;
  duracaoMs: number;
}

export interface RespostaAgente {
  passos: PassoAgente[];
  rodadas: number;
  resposta: string;
  resumo: ResumoRastro;
}
