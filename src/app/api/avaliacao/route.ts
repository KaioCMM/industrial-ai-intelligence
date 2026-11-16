import { connection } from "next/server";
import { respostaDeErro } from "@/core/erros";
import { supabaseConfigurado } from "@/core/supabase";
import { CONJUNTO_AVALIACAO } from "@/modules/avaliacao/conjunto";
import { listarExecucoes } from "@/modules/avaliacao/execucoes";
import { normasDisponiveis } from "@/modules/rag/ingestao";

/** Conjunto de teste e histórico de execuções. */
export async function GET() {
  await connection();
  try {
    return Response.json({
      configurado: supabaseConfigurado(),
      casos: (await normasDisponiveis()).length > 0 ? CONJUNTO_AVALIACAO : CONJUNTO_AVALIACAO.filter((c) => !c.exigeNormas),
      execucoes: await listarExecucoes(),
    });
  } catch (e) {
    return respostaDeErro(e);
  }
}
