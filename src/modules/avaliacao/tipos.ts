export interface Julgamento {
  justificativa: string;
  fidelidade: number;
  relevancia: number;
  completude: number;
  /** Média dos três critérios, de 1 a 5. */
  nota: number;
  modeloJuiz: string;
}

export interface CasoAvaliacao {
  id: string;
  pergunta: string;
  referencia: string;
  /** Só entra no conjunto quando as NRs foram baixadas e indexadas. */
  exigeNormas?: boolean;
}

export interface ResultadoCaso {
  casoId: string;
  resposta: string;
  julgamento: Julgamento;
  custoUsd: number;
  latenciaMs: number;
}

export interface ResumoExecucao {
  execucaoId: string;
  criadoEm: string;
  configuracao: string;
  casos: number;
  nota: number;
  fidelidade: number;
  relevancia: number;
  completude: number;
  custoUsd: number;
  latenciaMediaMs: number;
}
