import { connection } from "next/server";
import { PARAMETROS } from "@/core/config";
import { aceitaTemperatura, esforcoPara } from "@/core/regras-modelo";

export interface LinhaParametros {
  papel: string;
  etapa: string;
  modelo: string;
  temperaturaConfigurada: number;
  /** O que de fato vai na chamada: a configurada, ou o padrão do modelo (1) quando ele não aceita. */
  temperaturaAplicada: number;
  temperaturaAceita: boolean;
  raciocinio: string;
  maxTokens: number;
  estruturada: boolean;
  porque: string;
}

/**
 * Parâmetros efetivos de cada chamada ao modelo. Usa as mesmas regras do cliente
 * (regras-modelo.ts), então a tela mostra o que realmente vai para a API.
 */
export async function GET() {
  await connection();
  const linhas: LinhaParametros[] = Object.entries(PARAMETROS).map(([papel, p]) => {
    const esforco = esforcoPara(p.modelo, p.raciocinio);
    const aceita = aceitaTemperatura(p.modelo, esforco);
    return {
      papel,
      etapa: p.etapa,
      modelo: p.modelo,
      temperaturaConfigurada: p.temperatura,
      temperaturaAplicada: aceita ? p.temperatura : 1,
      temperaturaAceita: aceita,
      raciocinio: esforco ?? "não se aplica",
      maxTokens: p.maxTokens,
      estruturada: p.estruturada,
      porque: p.porque,
    };
  });
  return Response.json({ linhas });
}
