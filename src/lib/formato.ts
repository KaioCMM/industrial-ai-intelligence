// Formatação para leitura em português: vírgula decimal, ponto de milhar.

const inteiro = new Intl.NumberFormat("pt-BR");

export function fmtInteiro(v: number): string {
  return inteiro.format(Math.round(v));
}

/** Custos de LLM são frações de centavo: as casas decimais crescem conforme o valor encolhe. */
export function fmtUsd(v: number): string {
  if (v === 0) return "US$ 0";
  const casas = v >= 1 ? 2 : v >= 0.01 ? 4 : 6;
  return `US$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v)}`;
}

export function fmtMs(v: number): string {
  if (v < 1000) return `${Math.round(v)} ms`;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(v / 1000)} s`;
}

export function fmtDecimal(v: number, casas = 2): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v);
}

export function fmtPct(v: number, casas = 0): string {
  return `${fmtDecimal(v * 100, casas)}%`;
}

export function fmtDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function fmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
