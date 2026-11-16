import { connection } from "next/server";
import { respostaDeErro } from "@/core/erros";
import { montarPainel } from "@/modules/observabilidade/consultas";

export async function GET() {
  await connection();
  try {
    return Response.json(await montarPainel());
  } catch (e) {
    return respostaDeErro(e);
  }
}
