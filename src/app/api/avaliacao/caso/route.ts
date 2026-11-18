import { ErroEntrada, lerCorpo, respostaDeErro } from "@/core/erros";
import { novoRastro } from "@/core/llm";
import { resumirRastro } from "@/core/tipos";
import { CONJUNTO_AVALIACAO } from "@/modules/avaliacao/conjunto";
import { descreverConfiguracao, julgar, salvarJulgamento } from "@/modules/avaliacao/juiz";
import type { ResultadoCaso } from "@/modules/avaliacao/tipos";
import { formatarContexto } from "@/modules/rag/contexto";
import { executarRag } from "@/modules/rag/pipeline";
import type { ModoBusca } from "@/modules/rag/tipos";

export const maxDuration = 60;

// Um caso por requisição: o navegador percorre o conjunto e mostra o progresso
// caso a caso. Uma requisição única para os 9 casos levaria mais de um minuto
// sem retorno nenhum na tela, e um erro no meio perderia tudo.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODOS: ModoBusca[] = ["vetorial", "lexical", "hibrida"];

export async function POST(req: Request) {
  try {
    const corpo = await lerCorpo(req);
    const execucaoId = String(corpo.execucaoId ?? "");
    if (!UUID.test(execucaoId)) throw new ErroEntrada("execucaoId precisa ser um UUID.");
    const caso = CONJUNTO_AVALIACAO.find((c) => c.id === corpo.casoId);
    if (!caso) throw new ErroEntrada("Caso de avaliação desconhecido.");
    const modo = MODOS.includes(corpo.modo as ModoBusca) ? (corpo.modo as ModoBusca) : "hibrida";
    const reranquear = corpo.reranquear !== false;

    const rastro = novoRastro("avaliacao");
    const r = await executarRag({ pergunta: caso.pergunta, modo, reranquear, comparar: false }, rastro);
    const julgamento = await julgar(
      {
        pergunta: caso.pergunta,
        resposta: r.resposta,
        referencia: caso.referencia,
        // O mesmo contexto que o modelo recebeu, com fonte e título.
        contexto: formatarContexto(r.contexto),
      },
      rastro,
    );
    const resumo = resumirRastro(rastro);

    await salvarJulgamento({
      julgamento,
      origem: "avaliacao",
      configuracao: descreverConfiguracao(modo, reranquear),
      execucaoId,
      casoId: caso.id,
      pergunta: caso.pergunta,
      resposta: r.resposta,
      referencia: caso.referencia,
      custoUsd: resumo.custoUsd,
      latenciaMs: resumo.latenciaMs,
    });

    const resultado: ResultadoCaso = {
      casoId: caso.id,
      resposta: r.resposta,
      julgamento,
      custoUsd: resumo.custoUsd,
      latenciaMs: resumo.latenciaMs,
    };
    return Response.json(resultado);
  } catch (e) {
    return respostaDeErro(e);
  }
}
