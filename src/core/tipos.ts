// Tipos compartilhados entre servidor e navegador. Nada aqui importa SDK,
// para o painel poder exibir o rastro de uma requisição sem puxar dependência.

export type Modulo = "rag" | "roteamento" | "ferramentas" | "avaliacao";

export interface ChamadaLLM {
  modulo: Modulo;
  operacao: string;
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  custoUsd: number;
  latenciaMs: number;
  status: "ok" | "erro";
  erro?: string;
}

/** Tudo o que uma requisição gastou, chamada por chamada. */
export interface Rastro {
  traceId: string;
  modulo: Modulo;
  iniciadoEm: number;
  chamadas: ChamadaLLM[];
}

export interface ResumoRastro {
  traceId: string;
  chamadas: ChamadaLLM[];
  tokens: number;
  custoUsd: number;
  /** Tempo de parede da requisição inteira, não a soma das chamadas (há chamadas em paralelo). */
  latenciaMs: number;
}

export function resumirRastro(rastro: Rastro): ResumoRastro {
  return {
    traceId: rastro.traceId,
    chamadas: rastro.chamadas,
    tokens: rastro.chamadas.reduce((s, c) => s + c.tokensEntrada + c.tokensSaida, 0),
    custoUsd: rastro.chamadas.reduce((s, c) => s + c.custoUsd, 0),
    latenciaMs: Date.now() - rastro.iniciadoEm,
  };
}
