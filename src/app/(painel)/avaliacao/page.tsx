"use client";

import { useCallback, useEffect, useState } from "react";
import { Alternador, Aviso, Botao, Cabecalho, Interruptor, Lampada, Medidor, Painel, Secao } from "@/components/ui";
import { Explicacao } from "@/components/explicacao";
import { chamarApi } from "@/lib/api";
import type { Termo } from "@/lib/glossario";
import { fmtDataHora, fmtDecimal, fmtMs, fmtUsd } from "@/lib/formato";
import type { CasoAvaliacao, ResultadoCaso, ResumoExecucao } from "@/modules/avaliacao/tipos";
import type { ModoBusca } from "@/modules/rag/tipos";

const CRITERIOS: { nome: string; pergunta: string; mede: string; termo: Termo }[] = [
  { termo: "fidelidade", nome: "Fidelidade", pergunta: "Toda afirmação está sustentada pelos trechos recuperados?", mede: "alucinação" },
  { termo: "relevancia", nome: "Relevância", pergunta: "A resposta trata do que foi perguntado?", mede: "desvio de assunto" },
  { termo: "completude", nome: "Completude", pergunta: "Cobre os pontos essenciais do gabarito?", mede: "resposta incompleta" },
];

export default function PaginaAvaliacao() {
  const [casos, setCasos] = useState<CasoAvaliacao[]>([]);
  const [execucoes, setExecucoes] = useState<ResumoExecucao[]>([]);
  const [configurado, setConfigurado] = useState(true);
  const [modo, setModo] = useState<ModoBusca>("hibrida");
  const [reranquear, setReranquear] = useState(true);
  const [resultados, setResultados] = useState<Record<string, ResultadoCaso | "rodando" | "erro">>({});
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    chamarApi<{ configurado: boolean; casos: CasoAvaliacao[]; execucoes: ResumoExecucao[] }>("/api/avaliacao")
      .then((r) => {
        setCasos(r.casos);
        setExecucoes(r.execucoes);
        setConfigurado(r.configurado);
      })
      .catch((e) => setErro(e.message));
  }, []);

  useEffect(carregar, [carregar]);

  async function executar() {
    setRodando(true);
    setErro(null);
    setResultados({});
    const execucaoId = crypto.randomUUID();
    try {
      for (const caso of casos) {
        setResultados((r) => ({ ...r, [caso.id]: "rodando" }));
        try {
          const resultado = await chamarApi<ResultadoCaso>("/api/avaliacao/caso", { execucaoId, casoId: caso.id, modo, reranquear });
          setResultados((r) => ({ ...r, [caso.id]: resultado }));
        } catch (e) {
          setResultados((r) => ({ ...r, [caso.id]: "erro" }));
          throw e;
        }
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setRodando(false);
      carregar();
    }
  }

  const concluidos = Object.values(resultados).filter((r) => typeof r === "object").length;
  const melhor = execucoes.length ? Math.max(...execucoes.map((e) => e.nota)) : null;

  return (
    <>
      <Cabecalho
        titulo="Avaliação com juiz"
        termo="llm-juiz"
        descricao="Um segundo modelo corrige as respostas do RAG com uma rubrica fixa e um gabarito. É assim que se compara duas configurações por número, em vez de por impressão."
      />

      <Secao titulo="Rubrica" termo="rubrica" descricao="Notas de 1 a 5. O juiz escreve a justificativa antes de dar a nota e roda com temperatura 0.">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-linha bg-linha md:grid-cols-3">
          {CRITERIOS.map((c) => (
            <div key={c.nome} className="bg-painel px-5 py-5">
              <p className="flex items-center gap-2 text-xl font-semibold">
                {c.nome}
                <Explicacao termo={c.termo} />
              </p>
              <p className="mt-1 leading-snug">{c.pergunta}</p>
              <p className="mt-2 text-sm text-apagado">Pega {c.mede}.</p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Executar" termo="gabarito" descricao={`${casos.length} perguntas com gabarito. A última está fora da base: a resposta certa é admitir que não sabe.`}>
        {!configurado && (
          <div className="mb-6">
            <Aviso titulo="Supabase não configurado">A avaliação roda, mas as notas não ficam salvas para comparação.</Aviso>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
          <Alternador
            rotulo="Busca"
            opcoes={[
              { valor: "vetorial", nome: "Vetorial" },
              { valor: "lexical", nome: "Lexical" },
              { valor: "hibrida", nome: "Híbrida" },
            ]}
            valor={modo}
            aoMudar={setModo}
          />
          <Interruptor rotulo="Reranking" ligado={reranquear} aoMudar={setReranquear} />
          <Botao onClick={executar} carregando={rodando} disabled={casos.length === 0} className="ml-auto">
            Executar avaliação
          </Botao>
        </div>
        {(rodando || concluidos > 0) && (
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm text-suave tabular-nums">
              <span>{rodando ? "Avaliando…" : "Concluída"}</span>
              <span>
                {concluidos} de {casos.length}
              </span>
            </div>
            <Medidor valor={concluidos} maximo={casos.length} />
          </div>
        )}
      </Secao>

      {erro && (
        <div className="mb-10">
          <Aviso tipo="erro" titulo="A avaliação parou">
            {erro}
          </Aviso>
        </div>
      )}

      <Secao titulo="Casos" termo="alucinacao">
        <ul className="divide-y divide-linha border-y border-linha">
          {casos.map((caso) => {
            const r = resultados[caso.id];
            const resultado = typeof r === "object" ? r : null;
            return (
              <li key={caso.id} className="py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-[9px]">
                    <Lampada
                      estado={
                        r === "rodando" ? "ativo" : r === "erro" ? "alarme" : resultado ? (resultado.julgamento.nota < 3 ? "alarme" : "normal") : "apagado"
                      }
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <p className="font-medium">{caso.pergunta}</p>
                      {resultado && (
                        <p className="shrink-0 tabular-nums">
                          <span className="text-2xl font-semibold">{fmtDecimal(resultado.julgamento.nota, 1)}</span>
                          <span className="ml-3 text-sm text-apagado">
                            F {resultado.julgamento.fidelidade}, R {resultado.julgamento.relevancia}, C {resultado.julgamento.completude}
                          </span>
                        </p>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-apagado">Gabarito: {caso.referencia}</p>
                    {resultado && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-suave hover:text-texto">Resposta e justificativa do juiz</summary>
                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{resultado.resposta}</p>
                          <p className="text-sm leading-relaxed text-suave">{resultado.julgamento.justificativa}</p>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Secao>

      <Secao titulo="Histórico de execuções" termo="comparacao" descricao="Cada linha é uma configuração rodada sobre o mesmo conjunto. A lâmpada marca a maior nota média.">
        {execucoes.length === 0 ? (
          <p className="text-suave">Nenhuma execução salva ainda. Execute a avaliação para criar a primeira linha de base.</p>
        ) : (
          <Painel className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="text-sm text-apagado">
                <tr>
                  <th className="px-5 py-3 font-normal">Quando</th>
                  <th className="px-5 py-3 font-normal">Configuração</th>
                  <th className="px-5 py-3 text-right font-normal">Nota média</th>
                  <th className="px-5 py-3 text-right font-normal">Fidelidade</th>
                  <th className="px-5 py-3 text-right font-normal">Relevância</th>
                  <th className="px-5 py-3 text-right font-normal">Completude</th>
                  <th className="px-5 py-3 text-right font-normal">Custo</th>
                  <th className="px-5 py-3 text-right font-normal">Tempo por caso</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {execucoes.map((e) => (
                  <tr key={e.execucaoId} className="border-t border-linha">
                    <td className="px-5 py-3 text-suave">{fmtDataHora(e.criadoEm)}</td>
                    <td className="px-5 py-3">
                      {e.configuracao}
                      {e.casos < casos.length && <span className="ml-2 text-sm text-apagado">({e.casos} casos)</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center gap-2">
                        {e.nota === melhor && <Lampada estado="ativo" />}
                        <span className="font-semibold">{fmtDecimal(e.nota)}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">{fmtDecimal(e.fidelidade)}</td>
                    <td className="px-5 py-3 text-right">{fmtDecimal(e.relevancia)}</td>
                    <td className="px-5 py-3 text-right">{fmtDecimal(e.completude)}</td>
                    <td className="px-5 py-3 text-right">{fmtUsd(e.custoUsd)}</td>
                    <td className="px-5 py-3 text-right">{fmtMs(e.latenciaMediaMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Painel>
        )}
      </Secao>
    </>
  );
}
