import { ErroEntrada, lerCorpo, lerPergunta, respostaDeErro } from "@/core/erros";
import { novoRastro } from "@/core/llm";
import { resumirRastro } from "@/core/tipos";
import { descreverConfiguracao, julgar, salvarJulgamento } from "@/modules/avaliacao/juiz";
import type { RespostaJulgamento } from "@/modules/rag/tipos";

export const maxDuration = 60;

function lerTexto(valor: unknown, campo: string, maximo: number): string {
  if (typeof valor !== "string" || !valor.trim()) throw new ErroEntrada(`Envie ${campo} como texto.`);
  if (valor.length > maximo) throw new ErroEntrada(`${campo} passou de ${maximo} caracteres.`);
  return valor;
}

/**
 * Juiz fora do caminho da resposta: a tela mostra a resposta assim que ela termina e
 * pede a nota em seguida. Antes, o usuário esperava mais ~3 s pelo juiz antes de ver qualquer coisa.
 */
export async function POST(req: Request) {
  try {
    const corpo = await lerCorpo(req);
    const pergunta = lerPergunta(corpo.pergunta);
    const resposta = lerTexto(corpo.resposta, "a resposta", 8000);
    const contexto = lerTexto(corpo.contexto, "o contexto", 20000);
    const configuracao = descreverConfiguracao(String(corpo.modo ?? "hibrida"), corpo.reranquear !== false);

    const rastro = novoRastro("rag");
    const inicio = performance.now();
    const julgamento = await julgar({ pergunta, resposta, contexto }, rastro);
    const juizMs = performance.now() - inicio;
    const resumo = resumirRastro(rastro);

    await salvarJulgamento({
      julgamento,
      origem: "online",
      configuracao,
      pergunta,
      resposta,
      custoUsd: resumo.custoUsd,
      latenciaMs: resumo.latenciaMs,
    });

    const saida: RespostaJulgamento = { julgamento, juizMs, resumo };
    return Response.json(saida);
  } catch (e) {
    return respostaDeErro(e);
  }
}
