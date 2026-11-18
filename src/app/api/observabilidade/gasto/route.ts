import { connection } from "next/server";
import { tetoDiarioUsd } from "@/core/config";
import { respostaDeErro } from "@/core/erros";
import { gastoDeHoje } from "@/core/llm";
import { supabaseConfigurado } from "@/core/supabase";

/** Consulta leve usada pelo trilho lateral: gasto de hoje contra o teto. */
export async function GET() {
  await connection();
  try {
    return Response.json({
      configurado: supabaseConfigurado(),
      openaiConfigurada: Boolean(process.env.OPENAI_API_KEY),
      gastoHojeUsd: await gastoDeHoje(),
      tetoUsd: tetoDiarioUsd(),
    });
  } catch (e) {
    return respostaDeErro(e);
  }
}
