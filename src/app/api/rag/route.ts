import { lerCorpo, lerPergunta, respostaDeErro } from "@/core/erros";
import { novoRastro } from "@/core/llm";
import { resumirRastro } from "@/core/tipos";
import { descreverConfiguracao, julgar, salvarJulgamento } from "@/modules/avaliacao/juiz";
import { executarRag } from "@/modules/rag/pipeline";
import type { FiltroColecao, ModoBusca, RespostaRag } from "@/modules/rag/tipos";

export const maxDuration = 60;

const MODOS: ModoBusca[] = ["vetorial", "lexical", "hibrida"];
const COLECOES: FiltroColecao[] = ["todas", "projeto", "normas", "conceitos"];

export async function POST(req: Request) {
  try {
    const corpo = await lerCorpo(req);
    const pergunta = lerPergunta(corpo.pergunta);
    const modo = MODOS.includes(corpo.modo as ModoBusca) ? (corpo.modo as ModoBusca) : "hibrida";
    const reranquear = corpo.reranquear !== false;
    const avaliar = corpo.avaliar === true;
    const colecao = COLECOES.includes(corpo.colecao as FiltroColecao) ? (corpo.colecao as FiltroColecao) : "todas";

    const rastro = novoRastro("rag");
    const r = await executarRag({ pergunta, modo, reranquear, comparar: true, colecao }, rastro);

    let julgamento = null;
    let juizMs = 0;
    if (avaliar) {
      const inicio = performance.now();
      julgamento = await julgar(
        { pergunta, resposta: r.resposta, contexto: r.contexto.map((t) => t.conteudo).join("\n\n") },
        rastro,
      );
      juizMs = performance.now() - inicio;
    }

    const resumo = resumirRastro(rastro);
    if (julgamento) {
      await salvarJulgamento({
        julgamento,
        origem: "online",
        configuracao: descreverConfiguracao(modo, reranquear),
        pergunta,
        resposta: r.resposta,
        custoUsd: resumo.custoUsd,
        latenciaMs: resumo.latenciaMs,
      });
    }

    const resposta: RespostaRag = {
      modo,
      colecao,
      reranqueado: reranquear,
      comparacao: r.comparacao!,
      candidatos: r.candidatos,
      reranking: r.reranking,
      contexto: r.contexto,
      resposta: r.resposta,
      julgamento,
      tempos: { ...r.tempos, juizMs },
      resumo,
    };
    return Response.json(resposta);
  } catch (e) {
    return respostaDeErro(e);
  }
}
