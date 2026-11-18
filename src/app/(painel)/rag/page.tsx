"use client";

import { useEffect, useState } from "react";
import { Explicacao } from "@/components/explicacao";
import { TempoPorEtapa } from "@/components/graficos";
import { MapaEmbeddings } from "@/components/mapa-embeddings";
import {
  Alternador,
  Aviso,
  Botao,
  Cabecalho,
  CampoPergunta,
  CustoDaRequisicao,
  Exemplos,
  Interruptor,
  Lampada,
  Nota,
  Painel,
  Secao,
  TextoResposta,
} from "@/components/ui";
import { chamarApi } from "@/lib/api";
import { fmtDecimal, fmtMs, fmtUsd } from "@/lib/formato";
import type { Termo } from "@/lib/glossario";
import { formatarContexto } from "@/modules/rag/contexto";
import type { EstadoBase, EventoRag, FiltroColecao, ModoBusca, RespostaJulgamento, Trecho } from "@/modules/rag/tipos";

const EXEMPLOS = [
  "Por que o Projeto Linha 3 está atrasado?",
  "A estimativa de custo no término cabe na reserva de contingência?",
  "PM-022",
  "O que aprendemos em projetos anteriores sobre comissionamento?",
  "A partir de que altura a NR-35 se aplica?",
  "Quem pode entrar num silo para fazer manutenção?",
];

const COLECOES: { valor: FiltroColecao; nome: string }[] = [
  { valor: "todas", nome: "Tudo" },
  { valor: "projeto", nome: "Projeto" },
  { valor: "normas", nome: "NRs" },
  { valor: "conceitos", nome: "Conceitos" },
];

const NOMES_COLECAO: Record<string, string> = { projeto: "documentos do projeto", normas: "normas", conceitos: "conceitos" };

const TERMO_DO_MODO: Record<ModoBusca, Termo> = { vetorial: "busca-vetorial", lexical: "busca-lexical", hibrida: "busca-hibrida" };

const MODOS: { valor: ModoBusca; nome: string; explicacao: string }[] = [
  { valor: "vetorial", nome: "Vetorial", explicacao: "Significado: acha sinônimos e paráfrases, mas pode errar códigos e siglas." },
  { valor: "lexical", nome: "Lexical", explicacao: "Palavras exatas: acerta códigos como PM-022 ou o item 35.1.2, mas não entende paráfrase." },
  { valor: "hibrida", nome: "Híbrida (RRF)", explicacao: "Funde as duas listas pela posição: pega o melhor de cada uma." },
];

type EventoBusca = Extract<EventoRag, { tipo: "busca" }>;
type EventoFim = Extract<EventoRag, { tipo: "fim" }>;

function ListaBusca({ modo, trechos, usados }: { modo: (typeof MODOS)[number]; trechos: Trecho[]; usados: Set<number> }) {
  return (
    <Painel className="flex flex-col p-5">
      <h3 className="flex items-center gap-2 text-xl font-semibold">
        {modo.nome}
        <Explicacao termo={TERMO_DO_MODO[modo.valor]} />
      </h3>
      <p className="mt-1 min-h-12 text-sm text-apagado">{modo.explicacao}</p>
      {trechos.length === 0 ? (
        <p className="mt-4 text-suave">Nenhum trecho encontrado.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {trechos.slice(0, 5).map((t, i) => (
            <li key={t.id} className="border-t border-linha pt-3">
              <div className="flex items-start gap-2">
                <span className="mt-[7px]">
                  <Lampada estado={usados.has(t.id) ? "ativo" : "apagado"} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-suave">
                    {i + 1}. {t.fonte}
                    <span className="ml-2 text-apagado tabular-nums">score {fmtDecimal(t.score, 3)}</span>
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm leading-snug">{t.conteudo}</p>
                  {modo.valor === "hibrida" && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-apagado">
                      lexical {t.rankLexical ?? "fora"}, vetorial {t.rankVetorial ?? "fora"}
                      {i === 0 && <Explicacao termo="rrf" />}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Painel>
  );
}

export default function PaginaRag() {
  const [pergunta, setPergunta] = useState(EXEMPLOS[0]);
  const [modo, setModo] = useState<ModoBusca>("hibrida");
  const [colecao, setColecao] = useState<FiltroColecao>("todas");
  const [reranquear, setReranquear] = useState(true);
  const [avaliar, setAvaliar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // A resposta chega em partes: busca pronta, pedaços de texto, fim. Cada uma aparece quando existe.
  const [busca, setBusca] = useState<EventoBusca | null>(null);
  const [texto, setTexto] = useState("");
  const [fim, setFim] = useState<EventoFim | null>(null);
  // Medidos aqui, do lado de quem usa: é o tempo que a pessoa sente.
  const [percebido, setPercebido] = useState<{ buscas: number | null; primeiraPalavra: number | null }>({ buscas: null, primeiraPalavra: null });
  const [juiz, setJuiz] = useState<RespostaJulgamento | null>(null);
  const [julgando, setJulgando] = useState(false);

  const [base, setBase] = useState<EstadoBase | null>(null);
  const [indexando, setIndexando] = useState(false);
  const [msgBase, setMsgBase] = useState<string | null>(null);

  useEffect(() => {
    chamarApi<EstadoBase>("/api/rag/base").then(setBase).catch((e) => setMsgBase(e.message));
  }, []);

  async function indexar() {
    setIndexando(true);
    setMsgBase(null);
    try {
      const r = await chamarApi<{ documentos: number; trechos: number; resumo: { custoUsd: number } }>("/api/rag/base", {});
      setMsgBase(`${r.documentos} documentos divididos em ${r.trechos} trechos e indexados por ${fmtUsd(r.resumo.custoUsd)}.`);
      setBase(await chamarApi<EstadoBase>("/api/rag/base"));
    } catch (e) {
      setMsgBase(e instanceof Error ? e.message : String(e));
    } finally {
      setIndexando(false);
    }
  }

  async function perguntar() {
    setCarregando(true);
    setErro(null);
    setBusca(null);
    setTexto("");
    setFim(null);
    setJuiz(null);
    setPercebido({ buscas: null, primeiraPalavra: null });
    const inicio = performance.now();
    let eventoBusca: EventoBusca | null = null;
    let eventoFim: EventoFim | null = null;

    try {
      const resposta = await fetch("/api/rag", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pergunta, modo, colecao, reranquear }),
      });
      if (!resposta.ok || !resposta.body) {
        const json = await resposta.json().catch(() => ({}));
        throw new Error(json.erro ?? `A requisição falhou com status ${resposta.status}.`);
      }

      // Lê o fluxo linha a linha: cada linha é um evento JSON completo.
      const leitor = resposta.body.getReader();
      const decodificador = new TextDecoder();
      let pendente = "";
      let primeiraPalavraVista = false;
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        pendente += decodificador.decode(value, { stream: true });
        const linhas = pendente.split("\n");
        pendente = linhas.pop() ?? "";
        for (const linha of linhas) {
          if (!linha.trim()) continue;
          const evento = JSON.parse(linha) as EventoRag;
          if (evento.tipo === "busca") {
            eventoBusca = evento;
            setBusca(evento);
            setPercebido((p) => ({ ...p, buscas: performance.now() - inicio }));
          } else if (evento.tipo === "texto") {
            if (!primeiraPalavraVista) {
              primeiraPalavraVista = true;
              setPercebido((p) => ({ ...p, primeiraPalavra: performance.now() - inicio }));
            }
            setTexto((t) => t + evento.pedaco);
          } else if (evento.tipo === "fim") {
            eventoFim = evento;
            setFim(evento);
          } else {
            throw new Error(evento.erro);
          }
        }
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
      window.dispatchEvent(new Event("telemetria:atualizada"));
    }

    // O juiz roda depois, fora do caminho da resposta: ela já está na tela enquanto a nota é calculada.
    if (avaliar && eventoBusca && eventoFim) {
      setJulgando(true);
      chamarApi<RespostaJulgamento>("/api/rag/julgar", {
        pergunta,
        resposta: eventoFim.resposta,
        contexto: formatarContexto(eventoBusca.contexto),
        modo,
        reranquear,
      })
        .then(setJuiz)
        .catch((e) => setErro(`A resposta saiu, mas o juiz falhou: ${e instanceof Error ? e.message : String(e)}`))
        .finally(() => setJulgando(false));
    }
  }

  const usados = new Set(busca?.contexto.map((t) => t.id));
  const baseVazia = base?.configurado && base.trechos === 0;
  const destaqueMapa = busca
    ? { pergunta: fim?.pontoPergunta ?? null, candidatos: busca.candidatos.map((t) => t.id), contexto: busca.contexto.map((t) => t.id) }
    : null;

  return (
    <>
      <Cabecalho
        titulo="Busca e RAG"
        termo="rag"
        descricao="A pergunta passa pelas três buscas sobre os documentos do projeto e as normas regulamentadoras. Os melhores trechos são reordenados por relevância e só eles vão para o modelo responder, com citação da fonte."
      />

      <Painel className="mb-10 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <Lampada estado={!base ? "apagado" : base.trechos > 0 ? "normal" : "alarme"} />
          <Explicacao termo="banco-vetorial" />
          <p>
            {!base
              ? "Lendo o estado da base…"
              : !base.configurado
                ? "Supabase não configurado: a busca precisa da base vetorial."
                : base.trechos > 0
                  ? `Base indexada: ${base.trechos} trechos no pgvector (${Object.entries(base.porColecao)
                      .map(([c, n]) => `${n} de ${NOMES_COLECAO[c] ?? c}`)
                      .join(", ")}).${base.documentosNoCorpus > base.documentos ? " Há documentos novos: reindexe." : ""}`
                  : `A base está vazia. Indexe os ${base.documentosNoCorpus} documentos para começar.`}
          </p>
        </div>
        {base?.configurado && (
          <Botao variante={baseVazia ? "primario" : "secundario"} onClick={indexar} carregando={indexando}>
            {base.trechos > 0 ? "Reindexar base" : "Indexar base"}
          </Botao>
        )}
        {msgBase && <p className="w-full text-sm text-suave">{msgBase}</p>}
      </Painel>

      <Secao titulo="Pergunta" termo="embedding">
        <CampoPergunta rotulo="O que você quer saber da documentação?" valor={pergunta} aoMudar={setPergunta} linhas={2} />
        <Exemplos itens={EXEMPLOS} aoEscolher={setPergunta} />
        <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-5">
          <Alternador rotulo="Onde buscar" termo="colecoes" opcoes={COLECOES} valor={colecao} aoMudar={setColecao} />
          <Alternador
            rotulo="Busca que alimenta a resposta"
            termo="busca-hibrida"
            opcoes={MODOS.map((m) => ({ valor: m.valor, nome: m.nome }))}
            valor={modo}
            aoMudar={setModo}
          />
          <Interruptor
            rotulo="Reranking"
            termo="reranking"
            detalhe="Um modelo leve reordena os 12 candidatos"
            ligado={reranquear}
            aoMudar={setReranquear}
          />
          <Interruptor
            rotulo="Avaliar com o juiz"
            termo="llm-juiz"
            detalhe="A nota chega depois da resposta"
            ligado={avaliar}
            aoMudar={setAvaliar}
          />
          <Botao onClick={perguntar} carregando={carregando} disabled={pergunta.trim().length < 3} className="ml-auto">
            Buscar e responder
          </Botao>
        </div>
      </Secao>

      {erro && (
        <div className="mb-10">
          <Aviso tipo="erro" titulo="A busca não foi concluída">
            {erro}
          </Aviso>
        </div>
      )}

      {busca && (
        <>
          <Secao
            titulo="As três buscas lado a lado"
            termo="trechos"
            descricao="Mesma pergunta, mesmo embedding. A lâmpada acesa marca os trechos que chegaram ao modelo."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {MODOS.map((m) => (
                <ListaBusca key={m.valor} modo={m} trechos={busca.comparacao[m.valor]} usados={usados} />
              ))}
            </div>
          </Secao>

          {busca.reranking && (
            <Secao
              titulo="Reranking"
              termo="reranking"
              descricao={`A busca compara vetores; o reranker lê a pergunta e o trecho juntos e julga se o trecho responde. Dos ${busca.candidatos.length} candidatos, os 4 primeiros viram o contexto.`}
            >
              <Painel className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left">
                  <thead className="text-sm text-apagado">
                    <tr>
                      <th className="px-5 py-3 font-normal">Posição final</th>
                      <th className="px-5 py-3 font-normal">Trecho</th>
                      <th className="px-5 py-3 text-right font-normal">Posição na busca</th>
                      <th className="px-5 py-3 text-right font-normal">Nota do reranker</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {busca.reranking.map((t, i) => {
                      const subiu = t.posicaoOriginal - (i + 1);
                      return (
                        <tr key={t.id} className="border-t border-linha">
                          <td className="px-5 py-3 text-xl font-semibold">{i + 1}</td>
                          <td className="px-5 py-3">
                            <p>{t.titulo}</p>
                            <p className="text-sm text-apagado">{t.fonte}</p>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {t.posicaoOriginal}
                            {subiu > 0 && <span className="ml-2 text-sm text-normal">subiu {subiu}</span>}
                          </td>
                          <td className="px-5 py-3 text-right">{fmtDecimal(t.notaRerank, 1)} / 10</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Painel>
            </Secao>
          )}

          <Secao titulo="Resposta" termo="contexto">
            <Painel className="px-6 py-6">
              {texto ? (
                <TextoResposta texto={texto} />
              ) : (
                <p className="text-suave">{carregando ? "O modelo está começando a escrever…" : "Sem resposta."}</p>
              )}
              {/* Cursor piscando enquanto a resposta chega; some quando termina. */}
              {carregando && texto && <span className="ml-0.5 inline-block h-5 w-[2px] translate-y-1 animate-pulse bg-sinal" aria-hidden="true" />}
              <ol className="mt-6 space-y-1 border-t border-linha pt-4 text-sm text-suave">
                {busca.contexto.map((t, i) => (
                  <li key={t.id}>
                    <span className="font-semibold text-sinal">[{i + 1}]</span> {t.titulo} <span className="text-apagado">({t.fonte})</span>
                  </li>
                ))}
              </ol>
            </Painel>
          </Secao>

          {(julgando || juiz) && (
            <Secao
              titulo="Nota do juiz"
              termo="rubrica"
              descricao={juiz ? `Avaliada por ${juiz.julgamento.modeloJuiz} com rubrica fixa, em ${fmtMs(juiz.juizMs)}, depois da resposta.` : undefined}
            >
              {juiz ? (
                <Painel className="grid gap-6 px-6 py-5 md:grid-cols-[auto_1fr]">
                  <div className="space-y-2">
                    <Nota rotulo="Fidelidade" termo="fidelidade" valor={juiz.julgamento.fidelidade} />
                    <Nota rotulo="Relevância" termo="relevancia" valor={juiz.julgamento.relevancia} />
                    <Nota rotulo="Completude" termo="completude" valor={juiz.julgamento.completude} />
                  </div>
                  <p className="max-w-[60ch] leading-relaxed text-suave">{juiz.julgamento.justificativa}</p>
                </Painel>
              ) : (
                <p className="text-suave">O juiz está avaliando a resposta…</p>
              )}
            </Secao>
          )}
        </>
      )}

      <Secao
        titulo="Mapa dos embeddings"
        termo="mapa-embeddings"
        descricao={
          busca
            ? "Cada ponto é um trecho da base. O losango é a sua pergunta, ligado aos trechos que a busca trouxe; os maiores, com borda branca, viraram o contexto."
            : "Cada ponto é um trecho da base, posicionado pelo significado. Faça uma pergunta para ver onde ela cai e quais trechos a busca alcança."
        }
      >
        <MapaEmbeddings destaque={destaqueMapa} />
      </Secao>

      {fim && (
        <Secao titulo="Para onde foi o tempo" termo="tempo-etapa">
          <Painel className="mb-4 px-5 py-4">
            <p className="mb-4 text-[15px] text-suave">
              As buscas apareceram em <span className="font-semibold text-texto">{fmtMs(percebido.buscas ?? 0)}</span>, a primeira palavra
              em <span className="font-semibold text-texto">{fmtMs(percebido.primeiraPalavra ?? 0)}</span> e a resposta completa em{" "}
              <span className="font-semibold text-texto">{fmtMs(fim.resumo.latenciaMs)}</span>.
            </p>
            <TempoPorEtapa
              etapas={[
                { nome: "Busca", ms: fim.tempos.buscaMs },
                { nome: "Reranking", ms: fim.tempos.rerankMs },
                { nome: "Geração", ms: fim.tempos.geracaoMs },
                { nome: "Juiz (depois)", ms: juiz?.juizMs ?? 0 },
              ]}
            />
          </Painel>
          <CustoDaRequisicao resumo={fim.resumo} />
        </Secao>
      )}
    </>
  );
}
