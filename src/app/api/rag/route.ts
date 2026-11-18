import { lerCorpo, lerPergunta, respostaDeErro } from "@/core/erros";
import { novoRastro } from "@/core/llm";
import { resumirRastro } from "@/core/tipos";
import { executarRag } from "@/modules/rag/pipeline";
import type { EventoRag, FiltroColecao, ModoBusca } from "@/modules/rag/tipos";

export const maxDuration = 60;

const MODOS: ModoBusca[] = ["vetorial", "lexical", "hibrida"];
const COLECOES: FiltroColecao[] = ["todas", "projeto", "normas", "conceitos"];

/**
 * Responde em fluxo (NDJSON, um evento por linha): as buscas chegam à tela assim que o
 * contexto fica pronto, e a resposta aparece palavra a palavra. O tempo total é o mesmo;
 * o que muda é o usuário não ficar olhando para uma tela parada até o fim.
 * O juiz saiu daqui: roda depois, em /api/rag/julgar, fora do caminho da resposta.
 */
export async function POST(req: Request) {
  let opcoes: { pergunta: string; modo: ModoBusca; reranquear: boolean; colecao: FiltroColecao };
  try {
    const corpo = await lerCorpo(req);
    opcoes = {
      pergunta: lerPergunta(corpo.pergunta),
      modo: MODOS.includes(corpo.modo as ModoBusca) ? (corpo.modo as ModoBusca) : "hibrida",
      reranquear: corpo.reranquear !== false,
      colecao: COLECOES.includes(corpo.colecao as FiltroColecao) ? (corpo.colecao as FiltroColecao) : "todas",
    };
  } catch (e) {
    // Erro de entrada ainda vira uma resposta comum, com o status certo.
    return respostaDeErro(e);
  }

  // Quem fecha a aba ou sai da tela cancela o fluxo. O cancelamento desce até a OpenAI
  // (pipeline → llm.ts): sem isso, ela continuaria gerando, e cobrando, até o fim.
  const cancelamento = new AbortController();
  req.signal.addEventListener("abort", () => cancelamento.abort(), { once: true });

  const codificador = new TextEncoder();
  const fluxo = new ReadableStream<Uint8Array>({
    async start(controle) {
      // Depois do cancelamento o fluxo já está fechado, e escrever nele lançaria erro.
      const enviar = (evento: EventoRag) => {
        if (!cancelamento.signal.aborted) controle.enqueue(codificador.encode(`${JSON.stringify(evento)}\n`));
      };
      const rastro = novoRastro("rag");
      try {
        const r = await executarRag({ ...opcoes, comparar: true }, rastro, {
          aoBuscar: (b) =>
            enviar({
              tipo: "busca",
              modo: opcoes.modo,
              colecao: opcoes.colecao,
              reranqueado: opcoes.reranquear,
              comparacao: b.comparacao!,
              candidatos: b.candidatos,
              reranking: b.reranking,
              contexto: b.contexto,
              tempos: b.tempos,
            }),
          aoReceber: (pedaco) => enviar({ tipo: "texto", pedaco }),
          sinal: cancelamento.signal,
        });
        enviar({ tipo: "fim", resposta: r.resposta, tempos: r.tempos, pontoPergunta: r.pontoPergunta, resumo: resumirRastro(rastro) });
      } catch (e) {
        // Cancelado: ninguém está lendo, então não há erro para enviar nem para logar.
        if (cancelamento.signal.aborted) return;
        // O status HTTP já foi enviado (200); o erro vai como evento, com a mesma frase das outras rotas.
        const { erro } = await respostaDeErro(e).json();
        enviar({ tipo: "erro", erro });
      } finally {
        if (!cancelamento.signal.aborted) controle.close();
      }
    },
    cancel() {
      cancelamento.abort();
    },
  });

  return new Response(fluxo, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
