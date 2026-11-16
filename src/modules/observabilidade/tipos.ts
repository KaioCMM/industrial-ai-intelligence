import type { ResumoExecucao } from "@/modules/avaliacao/tipos";

export interface Distribuicao {
  chamadas: number;
  custoUsd: number;
  tokens: number;
  p50: number;
  p95: number;
  erros: number;
}

export interface PainelObservabilidade {
  configurado: boolean;
  periodoDias: number;
  amostraLimitada: boolean;
  teto: { gastoHojeUsd: number; tetoUsd: number };
  totais: Distribuicao & { tokensEntrada: number; tokensSaida: number };
  porModelo: (Distribuicao & { modelo: string })[];
  porModulo: (Distribuicao & { modulo: string })[];
  porOperacao: (Distribuicao & { operacao: string })[];
  /** Percentis calculados sobre todas as latências da etapa: percentil não se soma nem se tira o máximo. */
  porEtapa: (Distribuicao & { etapa: string })[];
  serie: { hora: string; custoUsd: number; chamadas: number }[];
  qualidade: {
    julgamentos: number;
    nota: number | null;
    fidelidade: number | null;
    relevancia: number | null;
    completude: number | null;
  };
  execucoes: ResumoExecucao[];
  recentes: {
    criadoEm: string;
    traceId: string;
    modulo: string;
    operacao: string;
    modelo: string;
    tokens: number;
    custoUsd: number;
    latenciaMs: number;
    status: string;
  }[];
}
