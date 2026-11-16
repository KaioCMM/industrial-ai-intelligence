"use client";

import { useEffect, useState } from "react";
import {
  Aviso,
  Botao,
  Cabecalho,
  CampoPergunta,
  CustoDaRequisicao,
  Exemplos,
  FaixaIndicadores,
  Indicador,
  Painel,
  Secao,
  TextoResposta,
} from "@/components/ui";
import { PRECOS_USD_POR_MILHAO } from "@/core/precos";
import { chamarApi } from "@/lib/api";
import { fmtDecimal, fmtPct, fmtUsd } from "@/lib/formato";
import type { Complexidade, RespostaRoteamento } from "@/modules/roteamento/tipos";

const EXEMPLOS = [
  "O que significa a sigla EPC?",
  "Se o EV é 292,8 e o PV é 326,4, qual é o SPI?",
  "Explique a diferença entre caminho crítico e folga total.",
  "Qual a diferença entre pré-comissionamento e comissionamento?",
  "Monte um plano de recuperação de 90 dias para um projeto com SPI 0,90 e CPI 0,92, com ações, riscos e indicadores.",
  "A entrega do transformador da subestação atrasou 3 meses. Analise as alternativas (alugar, resequenciar, acelerar) com prós, contras e impacto no prazo.",
];

const FAIXAS: { valor: Complexidade; nome: string; quando: string }[] = [
  { valor: "simples", nome: "Simples", quando: "Fato direto, sigla, conta de uma etapa" },
  { valor: "moderada", nome: "Moderada", quando: "Explicação, comparação, procedimento" },
  { valor: "complexa", nome: "Complexa", quando: "Plano de recuperação, análise de impacto" },
];

interface Linha {
  pergunta: string;
  r: RespostaRoteamento;
}

export default function PaginaRoteamento() {
  const [mapa, setMapa] = useState<Record<Complexidade, string> | null>(null);
  const [pergunta, setPergunta] = useState(EXEMPLOS[0]);
  const [historico, setHistorico] = useState<Linha[]>([]);
  const [selecionada, setSelecionada] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    chamarApi<{ mapa: Record<Complexidade, string> }>("/api/roteamento").then((r) => setMapa(r.mapa)).catch(() => {});
  }, []);

  async function rodar(perguntas: string[]) {
    setCarregando(true);
    setErro(null);
    try {
      for (const [i, p] of perguntas.entries()) {
        if (perguntas.length > 1) setProgresso(`Pergunta ${i + 1} de ${perguntas.length}`);
        const r = await chamarApi<RespostaRoteamento>("/api/roteamento", { pergunta: p });
        setHistorico((h) => [{ pergunta: p, r }, ...h]);
        setSelecionada(0);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
      setProgresso(null);
    }
  }

  const custoReal = historico.reduce((s, l) => s + l.r.custoRealUsd, 0);
  const custoSem = historico.reduce((s, l) => s + l.r.custoSemRoteamentoUsd, 0);
  const economia = custoSem > 0 ? 1 - custoReal / custoSem : 0;
  const atual = historico[selecionada];

  return (
    <>
      <Cabecalho
        titulo="Roteamento de modelos"
        termo="roteamento"
        descricao="Um classificador barato lê a pergunta e decide qual modelo responde. Pergunta simples vai para o modelo leve; só o que exige raciocínio chega ao modelo forte, que custa 20 vezes mais."
      />

      <Secao titulo="Regras de roteamento" termo="saida-estruturada" descricao="Preço por milhão de tokens de entrada e de saída.">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-linha bg-linha md:grid-cols-3">
          {FAIXAS.map((f) => {
            const modelo = mapa?.[f.valor];
            const preco = modelo ? PRECOS_USD_POR_MILHAO[modelo] : undefined;
            const emUso = atual?.r.decisao.complexidade === f.valor;
            return (
              <div key={f.valor} className={`bg-painel px-5 py-5 ${emUso ? "shadow-[inset_0_3px_0_var(--color-sinal)]" : ""}`}>
                <p className="text-xl font-semibold">{f.nome}</p>
                <p className="mt-1 text-sm text-apagado">{f.quando}</p>
                <p className="mt-4 text-lg">{modelo ?? "…"}</p>
                <p className="text-sm text-suave tabular-nums">
                  {preco ? `US$ ${fmtDecimal(preco.entrada)} entrada, US$ ${fmtDecimal(preco.saida)} saída` : "preço não cadastrado"}
                </p>
              </div>
            );
          })}
        </div>
      </Secao>

      <Secao titulo="Pergunta">
        <CampoPergunta rotulo="Pergunte qualquer coisa de gestão de projetos ou obra" valor={pergunta} aoMudar={setPergunta} linhas={2} />
        <Exemplos itens={EXEMPLOS} aoEscolher={setPergunta} />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Botao onClick={() => rodar([pergunta])} carregando={carregando && !progresso} disabled={carregando || pergunta.trim().length < 3}>
            Rotear e responder
          </Botao>
          <Botao variante="secundario" onClick={() => rodar(EXEMPLOS)} carregando={!!progresso} disabled={carregando}>
            Rodar os {EXEMPLOS.length} exemplos
          </Botao>
          {progresso && <span className="text-suave">{progresso}</span>}
        </div>
      </Secao>

      {erro && (
        <div className="mb-10">
          <Aviso tipo="erro" titulo="O roteamento não foi concluído">
            {erro}
          </Aviso>
        </div>
      )}

      {historico.length > 0 && (
        <>
          <Secao titulo="Economia nesta sessão" termo="economia" descricao="Comparação com mandar tudo para o modelo forte, contando também o custo do classificador.">
            <FaixaIndicadores>
              <Indicador rotulo="Perguntas roteadas" valor={historico.length} />
              <Indicador rotulo="Custo com roteamento" termo="custo" valor={fmtUsd(custoReal)} />
              <Indicador rotulo="Custo só com o modelo forte" termo="economia" valor={fmtUsd(custoSem)} detalhe="estimativa com os mesmos tokens" />
              <Indicador rotulo="Economia" valor={fmtPct(Math.max(economia, 0))} estado={economia < 0 ? "alarme" : undefined} />
            </FaixaIndicadores>
          </Secao>

          <Secao titulo="Decisões do roteador" termo="roteamento">
            <Painel className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="text-sm text-apagado">
                  <tr>
                    <th className="px-5 py-3 font-normal">Pergunta</th>
                    <th className="px-5 py-3 font-normal">Complexidade</th>
                    <th className="px-5 py-3 font-normal">Modelo</th>
                    <th className="px-5 py-3 text-right font-normal">Custo real</th>
                    <th className="px-5 py-3 text-right font-normal">Sem roteamento</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {historico.map((l, i) => (
                    <tr
                      key={l.r.resumo.traceId}
                      onClick={() => setSelecionada(i)}
                      className={`cursor-pointer border-t border-linha ${i === selecionada ? "bg-elevado" : "hover:bg-elevado/50"}`}
                    >
                      <td className="max-w-[380px] px-5 py-3">
                        <button type="button" className="line-clamp-2 text-left" onClick={() => setSelecionada(i)}>
                          {l.pergunta}
                        </button>
                      </td>
                      <td className="px-5 py-3 capitalize">{l.r.decisao.complexidade}</td>
                      <td className="px-5 py-3 text-suave">{l.r.modelo}</td>
                      <td className="px-5 py-3 text-right">{fmtUsd(l.r.custoRealUsd)}</td>
                      <td className="px-5 py-3 text-right text-suave">{fmtUsd(l.r.custoSemRoteamentoUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Painel>
          </Secao>

          {atual && (
            <Secao titulo="Resposta selecionada" termo="raciocinio">
              <Painel className="mb-4 px-6 py-5">
                <p className="text-suave">
                  <span className="font-semibold text-texto capitalize">{atual.r.decisao.complexidade}</span>, porque{" "}
                  {atual.r.decisao.motivo.charAt(0).toLowerCase() + atual.r.decisao.motivo.slice(1)}
                </p>
                <div className="mt-5 border-t border-linha pt-5">
                  <TextoResposta texto={atual.r.resposta} />
                </div>
              </Painel>
              <CustoDaRequisicao resumo={atual.r.resumo} />
            </Secao>
          )}
        </>
      )}
    </>
  );
}
