import { connection } from "next/server";
import { respostaDeErro } from "@/core/erros";
import { novoRastro } from "@/core/llm";
import { resumirRastro } from "@/core/tipos";
import { estadoDaBase, ingerirCorpus } from "@/modules/rag/ingestao";

export const maxDuration = 60;

/** Quantos trechos estão indexados. */
export async function GET() {
  await connection();
  try {
    return Response.json(await estadoDaBase());
  } catch (e) {
    return respostaDeErro(e);
  }
}

/** Reindexa o corpus: divide em trechos, gera embeddings e grava no Supabase. */
export async function POST() {
  try {
    const rastro = novoRastro("rag");
    const resultado = await ingerirCorpus(rastro);
    return Response.json({ ...resultado, resumo: resumirRastro(rastro) });
  } catch (e) {
    return respostaDeErro(e);
  }
}
