import { connection } from "next/server";
import { respostaDeErro } from "@/core/erros";
import { obterMapa } from "@/modules/rag/mapa";

/** Os trechos da base projetados em 2D (PCA), para o mapa dos embeddings. */
export async function GET() {
  await connection();
  try {
    return Response.json(await obterMapa());
  } catch (e) {
    return respostaDeErro(e);
  }
}
