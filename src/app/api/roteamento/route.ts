import { connection } from "next/server";
import { lerCorpo, lerPergunta, respostaDeErro } from "@/core/erros";
import { novoRastro } from "@/core/llm";
import { resumirRastro } from "@/core/tipos";
import { MAPA_ROTAS, rotearEResponder } from "@/modules/roteamento/roteador";
import type { RespostaRoteamento } from "@/modules/roteamento/tipos";

export const maxDuration = 60;

/** Qual modelo atende cada faixa de complexidade (vem do .env). */
export async function GET() {
  await connection();
  return Response.json({ mapa: MAPA_ROTAS });
}

export async function POST(req: Request) {
  try {
    const pergunta = lerPergunta((await lerCorpo(req)).pergunta);
    const rastro = novoRastro("roteamento");
    const r = await rotearEResponder(pergunta, rastro);
    const resposta: RespostaRoteamento = { ...r, resumo: resumirRastro(rastro) };
    return Response.json(resposta);
  } catch (e) {
    return respostaDeErro(e);
  }
}
