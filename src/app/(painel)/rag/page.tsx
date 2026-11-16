"use client";

import { useEffect, useState } from "react";
import { TempoPorEtapa } from "@/components/graficos";
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
import { Explicacao } from "@/components/explicacao";
import { chamarApi } from "@/lib/api";
import type { Termo } from "@/lib/glossario";
import { fmtDecimal, fmtUsd } from "@/lib/formato";
import type { EstadoBase, FiltroColecao, ModoBusca, RespostaRag, Trecho } from "@/modules/rag/tipos";

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
  const [resultado, setResultado] = useState<RespostaRag | null>(null);

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
    try {
      setResultado(await chamarApi<RespostaRag>("/api/rag", { pergunta, modo, colecao, reranquear, avaliar }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  const usados = new Set(resultado?.contexto.map((t) => t.id));
  const baseVazia = base?.configurado && base.trechos === 0;

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
            detalhe="Um modelo leve reordena os 8 candidatos"
            ligado={reranquear}
            aoMudar={setReranquear}
          />
          <Interruptor
            rotulo="Avaliar com o juiz"
            termo="llm-juiz"
            detalhe="Nota de fidelidade, relevância e completude"
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

      {resultado && (
        <>
          <Secao
            titulo="As três buscas lado a lado"
            termo="trechos"
            descricao="Mesma pergunta, mesmo embedding. A lâmpada acesa marca os trechos que chegaram ao modelo."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {MODOS.map((m) => (
                <ListaBusca key={m.valor} modo={m} trechos={resultado.comparacao[m.valor]} usados={usados} />
              ))}
            </div>
          </Secao>

          {resultado.reranking && (
            <Secao
              titulo="Reranking"
              termo="reranking"
              descricao="A busca compara vetores; o reranker lê a pergunta e o trecho juntos e julga se o trecho responde. Os 4 primeiros viram o contexto."
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
                    {resultado.reranking.map((t, i) => {
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
              <TextoResposta texto={resultado.resposta} />
              <ol className="mt-6 space-y-1 border-t border-linha pt-4 text-sm text-suave">
                {resultado.contexto.map((t, i) => (
                  <li key={t.id}>
                    <span className="font-semibold text-sinal">[{i + 1}]</span> {t.titulo}{" "}
                    <span className="text-apagado">({t.fonte})</span>
                  </li>
                ))}
              </ol>
            </Painel>
          </Secao>

          {resultado.julgamento && (
            <Secao titulo="Nota do juiz" termo="rubrica" descricao={`Avaliada por ${resultado.julgamento.modeloJuiz} com rubrica fixa.`}>
              <Painel className="grid gap-6 px-6 py-5 md:grid-cols-[auto_1fr]">
                <div className="space-y-2">
                  <Nota rotulo="Fidelidade" termo="fidelidade" valor={resultado.julgamento.fidelidade} />
                  <Nota rotulo="Relevância" termo="relevancia" valor={resultado.julgamento.relevancia} />
                  <Nota rotulo="Completude" termo="completude" valor={resultado.julgamento.completude} />
                </div>
                <p className="max-w-[60ch] leading-relaxed text-suave">{resultado.julgamento.justificativa}</p>
              </Painel>
            </Secao>
          )}

          <Secao titulo="Para onde foi o tempo" termo="tempo-etapa">
            <Painel className="mb-4 px-5 py-4">
              <TempoPorEtapa
                etapas={[
                  { nome: "Busca", ms: resultado.tempos.buscaMs },
                  { nome: "Reranking", ms: resultado.tempos.rerankMs },
                  { nome: "Geração", ms: resultado.tempos.geracaoMs },
                  { nome: "Juiz", ms: resultado.tempos.juizMs },
                ]}
              />
            </Painel>
            <CustoDaRequisicao resumo={resultado.resumo} />
          </Secao>
        </>
      )}
    </>
  );
}
