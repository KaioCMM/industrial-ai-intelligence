import { lerCorpo, lerPergunta, respostaDeErro } from "@/core/erros";
import { novoRastro } from "@/core/llm";
import { resumirRastro } from "@/core/tipos";
import { executarAgente } from "@/modules/ferramentas/agente";
import type { RespostaAgente } from "@/modules/ferramentas/tipos";

export const maxDuration = 90;

export async function POST(req: Request) {
  try {
    const pergunta = lerPergunta((await lerCorpo(req)).pergunta);
    const rastro = novoRastro("ferramentas");
    const r = await executarAgente(pergunta, rastro);
    const resposta: RespostaAgente = { ...r, resumo: resumirRastro(rastro) };
    return Response.json(resposta);
  } catch (e) {
    return respostaDeErro(e);
  }
}
