"use client";

import { useCallback, useEffect, useState } from "react";
import { BarrasHorizontais, ColunasPorHora } from "@/components/graficos";
import { Aviso, Botao, Cabecalho, FaixaIndicadores, Indicador, Lampada, Medidor, Nota, Painel, Secao } from "@/components/ui";
import { chamarApi } from "@/lib/api";
import { fmtDataHora, fmtDecimal, fmtHora, fmtInteiro, fmtMs, fmtUsd } from "@/lib/formato";
import type { PainelObservabilidade } from "@/modules/observabilidade/tipos";

const NOMES_MODULO: Record<string, string> = {
  rag: "Busca e RAG",
  roteamento: "Roteamento",
  ferramentas: "Function calling",
  avaliacao: "Avaliação",
};

export default function PaginaObservabilidade() {
  const [painel, setPainel] = useState<PainelObservabilidade | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ler = useCallback(
    () =>
      chamarApi<PainelObservabilidade>("/api/observabilidade")
        .then((p) => {
          setPainel(p);
          setErro(null);
        })
        .catch((e) => setErro(e.message)),
    [],
  );

  useEffect(() => {
    ler();
  }, [ler]);

  function atualizar() {
    setCarregando(true);
    ler().finally(() => setCarregando(false));
  }

  const t = painel?.totais;

  return (
    <>
      <Cabecalho
        titulo="Observabilidade"
        termo="observabilidade"
        descricao="Toda chamada ao modelo passa por um único cliente, que mede tokens, custo e latência e grava no Supabase. Esta tela lê essa telemetria e as notas do juiz."
      >
        <Botao variante="secundario" className="mt-6" onClick={atualizar} carregando={carregando}>
          Atualizar
        </Botao>
      </Cabecalho>

      {erro && (
        <div className="mb-10">
          <Aviso tipo="erro" titulo="Não deu para ler a telemetria">
            {erro}
          </Aviso>
        </div>
      )}
      {painel && !painel.configurado && (
        <div className="mb-10">
          <Aviso titulo="Supabase não configurado">
            Sem o Supabase, as chamadas aparecem só no log do servidor. Configure o <code>.env.local</code> e rode a migração SQL.
          </Aviso>
        </div>
      )}
      {painel?.amostraLimitada && (
        <div className="mb-10">
          <Aviso titulo="Amostra limitada">Os totais consideram as 1.000 chamadas mais recentes do período.</Aviso>
        </div>
      )}

      {painel?.configurado && t && (
        <>
          <Secao titulo={`Últimos ${painel.periodoDias} dias`}>
            <FaixaIndicadores>
              <Indicador rotulo="Custo" termo="custo" valor={fmtUsd(t.custoUsd)} />
              <Indicador rotulo="Chamadas" termo="erros" valor={fmtInteiro(t.chamadas)} detalhe={t.erros ? `${t.erros} com erro` : "nenhum erro"} estado={t.erros ? "alarme" : undefined} />
              <Indicador rotulo="Tokens de entrada" termo="tokens" valor={fmtInteiro(t.tokensEntrada)} />
              <Indicador rotulo="Tokens de saída" termo="tokens" valor={fmtInteiro(t.tokensSaida)} />
              <Indicador rotulo="Latência p50" termo="percentis" valor={fmtMs(t.p50)} />
              <Indicador rotulo="Latência p95" termo="percentis" valor={fmtMs(t.p95)} />
            </FaixaIndicadores>
          </Secao>

          <div className="grid gap-x-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Secao titulo="Custo por hora" termo="custo" descricao="Últimas 24 horas. Passe o mouse numa coluna para ver o valor.">
              <Painel className="px-5 py-5">
                <ColunasPorHora
                  pontos={painel.serie.map((p) => ({
                    hora: p.hora,
                    valor: p.custoUsd,
                    dica: `${fmtHora(p.hora)}: ${fmtUsd(p.custoUsd)} em ${p.chamadas} chamadas`,
                  }))}
                  formatar={fmtUsd}
                  rotuloEixo={fmtHora}
                />
              </Painel>
            </Secao>

            <Secao titulo="Teto diário" termo="teto" descricao="Acima do teto, o cliente recusa a chamada antes de ela sair para a OpenAI.">
              <Painel className="px-5 py-5">
                <p className="text-[2.1rem] leading-none font-semibold tabular-nums">{fmtUsd(painel.teto.gastoHojeUsd)}</p>
                <p className="mt-1.5 text-sm text-apagado">gastos hoje, de {fmtUsd(painel.teto.tetoUsd)} permitidos</p>
                <Medidor valor={painel.teto.gastoHojeUsd} maximo={painel.teto.tetoUsd} className="mt-5 h-3" />
              </Painel>
            </Secao>
          </div>

          <div className="grid gap-x-10 lg:grid-cols-2">
            <Secao titulo="Custo por modelo" termo="roteamento">
              <Painel className="px-5 py-5">
                <BarrasHorizontais
                  itens={painel.porModelo.map((m) => ({ rotulo: m.modelo, valor: m.custoUsd, detalhe: `${fmtInteiro(m.chamadas)} chamadas` }))}
                  formatar={fmtUsd}
                />
              </Painel>
            </Secao>

            <Secao titulo="Qualidade" termo="llm-juiz" descricao={`Média de ${painel.qualidade.julgamentos} respostas avaliadas pelo juiz.`}>
              <Painel className="space-y-3 px-5 py-5">
                {painel.qualidade.nota === null ? (
                  <p className="text-suave">Sem avaliações no período. Rode a avaliação ou ligue o juiz na Busca e RAG.</p>
                ) : (
                  <>
                    <p className="text-[2.1rem] leading-none font-semibold tabular-nums">
                      {fmtDecimal(painel.qualidade.nota, 2)} <span className="text-xl text-apagado">de 5</span>
                    </p>
                    <div className="space-y-2 pt-2">
                      <Nota rotulo="Fidelidade" termo="fidelidade" valor={painel.qualidade.fidelidade ?? 0} />
                      <Nota rotulo="Relevância" termo="relevancia" valor={painel.qualidade.relevancia ?? 0} />
                      <Nota rotulo="Completude" termo="completude" valor={painel.qualidade.completude ?? 0} />
                    </div>
                  </>
                )}
              </Painel>
            </Secao>
          </div>

          <Secao titulo="Por módulo" termo="percentis" descricao="Latência por chamada ao modelo. p95 é o tempo que 95% das chamadas não ultrapassam.">
            <Painel className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead className="text-sm text-apagado">
                  <tr>
                    <th className="px-5 py-3 font-normal">Módulo</th>
                    <th className="px-5 py-3 text-right font-normal">Chamadas</th>
                    <th className="px-5 py-3 text-right font-normal">Tokens</th>
                    <th className="px-5 py-3 text-right font-normal">p50</th>
                    <th className="px-5 py-3 text-right font-normal">p95</th>
                    <th className="px-5 py-3 text-right font-normal">Erros</th>
                    <th className="px-5 py-3 text-right font-normal">Custo</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {painel.porModulo.map((m) => (
                    <tr key={m.modulo} className="border-t border-linha">
                      <td className="px-5 py-3">{NOMES_MODULO[m.modulo] ?? m.modulo}</td>
                      <td className="px-5 py-3 text-right">{fmtInteiro(m.chamadas)}</td>
                      <td className="px-5 py-3 text-right">{fmtInteiro(m.tokens)}</td>
                      <td className="px-5 py-3 text-right">{fmtMs(m.p50)}</td>
                      <td className="px-5 py-3 text-right">{fmtMs(m.p95)}</td>
                      <td className={`px-5 py-3 text-right ${m.erros ? "text-alarme" : "text-apagado"}`}>{m.erros}</td>
                      <td className="px-5 py-3 text-right">{fmtUsd(m.custoUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Painel>
          </Secao>

          <Secao titulo="Chamadas recentes" termo="trace">
            <Painel className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-apagado">
                  <tr>
                    <th className="px-5 py-3 font-normal">Quando</th>
                    <th className="px-5 py-3 font-normal">Módulo</th>
                    <th className="px-5 py-3 font-normal">Operação</th>
                    <th className="px-5 py-3 font-normal">Modelo</th>
                    <th className="px-5 py-3 text-right font-normal">Tokens</th>
                    <th className="px-5 py-3 text-right font-normal">Latência</th>
                    <th className="px-5 py-3 text-right font-normal">Custo</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {painel.recentes.map((c, i) => (
                    <tr key={i} className="border-t border-linha" title={`trace ${c.traceId}`}>
                      <td className="px-5 py-2.5 text-suave">{fmtDataHora(c.criadoEm)}</td>
                      <td className="px-5 py-2.5">{NOMES_MODULO[c.modulo] ?? c.modulo}</td>
                      <td className="px-5 py-2.5">
                        <span className="inline-flex items-center gap-2">
                          <Lampada estado={c.status === "ok" ? "normal" : "alarme"} />
                          {c.operacao}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-suave">{c.modelo}</td>
                      <td className="px-5 py-2.5 text-right">{fmtInteiro(c.tokens)}</td>
                      <td className="px-5 py-2.5 text-right">{fmtMs(c.latenciaMs)}</td>
                      <td className="px-5 py-2.5 text-right">{fmtUsd(c.custoUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {painel.recentes.length === 0 && <p className="px-5 py-4 text-suave">Nenhuma chamada no período.</p>}
            </Painel>
          </Secao>
        </>
      )}
    </>
  );
}
