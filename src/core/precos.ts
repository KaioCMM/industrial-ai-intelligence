// Tabela de preços em US$ por 1 milhão de tokens.
// Fica num arquivo só porque é o número que mais envelhece: quando a OpenAI
// mudar o preço, muda aqui e o painel inteiro acompanha.
// Família GPT-6 conferida em 16/11/2026 nas páginas oficiais dos modelos
// (developers.openai.com/api/docs/models). Confira antes de apresentar valores.
// Nos modelos de raciocínio, os tokens de raciocínio são cobrados como saída
// e já vêm somados em completion_tokens: o custo calculado aqui inclui o "pensar".

export const PRECOS_USD_POR_MILHAO: Record<string, { entrada: number; saida: number }> = {
  "gpt-6-luna": { entrada: 0.1, saida: 0.5 },
  "gpt-6.1-terra": { entrada: 1.0, saida: 5.0 },
  "gpt-6.1-sol": { entrada: 2.0, saida: 10.0 },
  "gpt-6-astra": { entrada: 10.0, saida: 50.0 },
  "gpt-5.4": { entrada: 2.5, saida: 15.0 },
  "gpt-5.4-mini": { entrada: 0.75, saida: 4.5 },
  "gpt-4.1": { entrada: 2.0, saida: 8.0 },
  "gpt-4.1-mini": { entrada: 0.4, saida: 1.6 },
  "gpt-4o-mini": { entrada: 0.15, saida: 0.6 },
  "text-embedding-3-small": { entrada: 0.02, saida: 0 },
  "text-embedding-3-large": { entrada: 0.13, saida: 0 },
};

function precoDe(modelo: string) {
  // A API às vezes responde com o nome datado ("gpt-4.1-mini-2025-04-14").
  return PRECOS_USD_POR_MILHAO[modelo] ?? PRECOS_USD_POR_MILHAO[modelo.replace(/-\d{4}-\d{2}-\d{2}$/, "")];
}

export function precoConhecido(modelo: string): boolean {
  return precoDe(modelo) !== undefined;
}

export function custoUsd(modelo: string, tokensEntrada: number, tokensSaida: number): number {
  const preco = precoDe(modelo);
  if (!preco) return 0;
  return (tokensEntrada * preco.entrada + tokensSaida * preco.saida) / 1_000_000;
}
