import type { ReasoningEffort } from "openai/resources/shared";

// Regras de quais parâmetros cada modelo aceita. Ficam fora do cliente (llm.ts)
// porque a tela de parâmetros mostra a mesma regra que o cliente aplica.
//
// Verificado em 16/11/2026 com chamadas de teste à API:
// - gpt-6-luna e gpt-6.1-terra aceitam temperature com reasoning_effort "none";
// - com qualquer raciocínio ("low" ou mais), recusam: só aceitam o padrão, 1;
// - gpt-6.1-sol não aceita "none" e, por isso, nunca aceita outra temperatura.

/** Modelos de raciocínio (GPT-5, GPT-6, série o) aceitam reasoning_effort. */
export const ehModeloDeRaciocinio = (modelo: string) => /^(gpt-5|gpt-6|o\d)/.test(modelo);

/** Modelos que não aceitam raciocínio "none": o mínimo deles é "low". */
const semRaciocinioZero = (modelo: string) => /^gpt-6(\.\d+)?-(sol|astra)/.test(modelo);

/** O esforço que de fato vai na chamada (ou nenhum, para modelos que não raciocinam). */
export function esforcoPara(modelo: string, pedido: ReasoningEffort | undefined): ReasoningEffort | undefined {
  if (!ehModeloDeRaciocinio(modelo) || !pedido) return undefined;
  return pedido === "none" && semRaciocinioZero(modelo) ? "low" : pedido;
}

/** Temperatura só vale em modelo sem raciocínio, ou em modelo de raciocínio com esforço "none". */
export function aceitaTemperatura(modelo: string, esforco: ReasoningEffort | undefined): boolean {
  return !ehModeloDeRaciocinio(modelo) || esforco === "none";
}
