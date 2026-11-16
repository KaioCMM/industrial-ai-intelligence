"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { Explicacao } from "@/components/explicacao";
import { Aviso, Cabecalho, FaixaIndicadores, Indicador, Lampada, Painel, Secao } from "@/components/ui";
import type { Termo } from "@/lib/glossario";
import { chamarApi } from "@/lib/api";
import { fmtDecimal, fmtInteiro, fmtMs, fmtUsd } from "@/lib/formato";
import { ETAPAS_PIPELINE as ETAPAS } from "@/modules/observabilidade/etapas";
import type { PainelObservabilidade } from "@/modules/observabilidade/tipos";

// A linha de processo é o elemento central da apresentação: o caminho de uma
// pergunta desenhado como num diagrama de planta, com os números reais de cada
// etapa vindos da telemetria. Cada etapa leva ao módulo que a demonstra.

const MODULOS = [
  {
    href: "/rag",
    termo: "rag" as Termo,
    nome: "Busca e RAG",
    mostra: "As buscas vetorial, lexical e híbrida lado a lado, o reranking reordenando e a resposta com citação.",
    destaque: "Pergunte “PM-022” ou o item de uma NR: só a busca lexical e a híbrida acham o código exato.",
  },
  {
    href: "/roteamento",
    termo: "roteamento" as Termo,
    nome: "Roteamento de modelos",
    mostra: "Cada pergunta classificada e enviada ao modelo mais barato que dá conta dela.",
    destaque: "Rode os 6 exemplos e mostre a economia contra usar só o modelo forte.",
  },
  {
    href: "/ferramentas",
    termo: "function-calling" as Termo,
    nome: "Function calling",
    mostra: "O agente lê cronograma, custos e riscos, simula atrasos e registra pedido de mudança, passo a passo.",
    destaque: "Pergunte o que acontece se os transportadores atrasarem 45 dias: ele lê a folga e calcula o impacto na partida.",
  },
  {
    href: "/avaliacao",
    termo: "llm-juiz" as Termo,
    nome: "Avaliação com juiz",
    mostra: "Perguntas com gabarito sobre o projeto e as NRs, notas por critério e comparação entre configurações.",
    destaque: "Rode com e sem reranking e compare as duas notas médias.",
  },
  {
    href: "/observabilidade",
    termo: "observabilidade" as Termo,
    nome: "Observabilidade",
    mostra: "Tokens, custo, latência p50 e p95 e qualidade, por modelo e por módulo.",
    destaque: "Mostre o teto de gasto diário: acima dele nenhuma chamada sai.",
  },
];

function Conector({ ativo }: { ativo: boolean }) {
  return (
    <div aria-hidden="true" className="flex items-center justify-center py-1 lg:px-0 lg:py-0">
      <div className={`h-6 w-[2px] lg:h-[2px] lg:w-full ${ativo ? "conector-v lg:conector-h" : "conector-inativo"}`} />
    </div>
  );
}

export default function VisaoGeral() {
  const [painel, setPainel] = useState<PainelObservabilidade | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    chamarApi<PainelObservabilidade>("/api/observabilidade").then(setPainel).catch((e) => setErro(e.message));
  }, []);

  // Percentis vêm prontos do servidor, calculados sobre todas as latências da etapa.
  const metricas = (id: string) => {
    const e = painel?.porEtapa.find((x) => x.etapa === id);
    return { chamadas: e?.chamadas ?? 0, custo: e?.custoUsd ?? 0, p50: e?.p50 ?? 0, p95: e?.p95 ?? 0 };
  };

  const t = painel?.totais;
  const semDados = painel?.configurado && t?.chamadas === 0;

  return (
    <>
      <Cabecalho
        titulo="Visão geral"
        termo="pipeline"
        descricao="O caminho de uma pergunta pelo sistema, com o que cada etapa custou e quanto demorou nos últimos 7 dias. Clique numa etapa para ver a técnica funcionando."
      />

      {erro && (
        <div className="mb-10">
          <Aviso tipo="erro" titulo="Não deu para ler a telemetria">
            {erro}
          </Aviso>
        </div>
      )}
      {painel && !painel.configurado && (
        <div className="mb-10">
          <Aviso titulo="Supabase ainda não configurado">
            Preencha <code>SUPABASE_URL</code> e <code>SUPABASE_SERVICE_ROLE_KEY</code> no <code>.env.local</code>, rode{" "}
            <code>supabase/migrations/0001_inicial.sql</code> no SQL Editor do Supabase e reinicie o servidor.
          </Aviso>
        </div>
      )}

      <Secao titulo="Como funciona" descricao="O sistema em quatro partes, na ordem em que vale contar numa apresentação.">
        <Painel className="grid gap-x-10 gap-y-7 px-6 py-6 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">O problema</h3>
            <p className="mt-1.5 leading-relaxed text-suave">
              Projetos de capital, como a expansão de uma planta industrial, custam centenas de milhões e costumam atrasar e estourar o
              orçamento. A informação para antecipar isso existe, mas está espalhada em cronograma, relatórios, registro de riscos, atas e
              normas.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">O que o sistema faz</h3>
            <p className="mt-1.5 leading-relaxed text-suave">
              Um assistente que lê esses documentos e dados e responde ao gerente do projeto citando a fonte. Busca nos documentos e nas NRs,
              escolhe o modelo certo para cada pergunta, consulta cronograma e custos por funções e mede custo, tempo e qualidade de cada
              resposta.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">O caminho de uma pergunta</h3>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 leading-relaxed text-suave marker:text-apagado">
              <li>A pergunta vira um vetor e é buscada por significado e por palavra exata.</li>
              <li>Um modelo leve reordena os 8 trechos encontrados e escolhe os 4 melhores.</li>
              <li>O modelo responde só com esses trechos e cita de onde tirou cada informação.</li>
              <li>Um juiz dá nota à resposta, e tudo vira telemetria de custo e tempo.</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold">O que é real e o que é simulado</h3>
            <p className="mt-1.5 leading-relaxed text-suave">
              <span className="text-texto">Real:</span> as 9 NRs oficiais do gov.br, os modelos da OpenAI, o banco vetorial no Supabase e o
              custo e o tempo medidos de cada chamada.{" "}
              <span className="text-texto">Simulado:</span> o Projeto Linha 3 e a Mineração Serra Azul, inventados porque documentos de obra
              reais são confidenciais, e os dados de cronograma e custos que o agente consulta.
            </p>
          </div>
        </Painel>
      </Secao>

      <Secao titulo="Linha de processo" termo="pipeline">
        <div className="grid lg:grid-cols-[1fr_32px_1fr_32px_1fr_32px_1fr_32px_1fr]">
          {ETAPAS.map((etapa, i) => {
            const m = metricas(etapa.id);
            const ativa = m.chamadas > 0;
            return (
              <Fragment key={etapa.id}>
                {i > 0 && <Conector ativo={ativa && metricas(ETAPAS[i - 1].id).chamadas > 0} />}
                {/* O ícone fica por cima da caixa, fora do link: botão dentro de link é HTML inválido. */}
                <div className="relative">
                <Explicacao termo={etapa.termo} className="absolute top-4 right-3 z-10" />
                <Link
                  href={etapa.href}
                  className="group block h-full rounded-2xl border border-linha bg-painel px-4 py-4 pr-9 hover:border-linha-forte"
                >
                  <div className="flex items-center gap-2">
                    <Lampada estado={ativa ? "ativo" : "apagado"} />
                    <span className="text-xl font-semibold group-hover:text-sinal">{etapa.nome}</span>
                  </div>
                  <p className="mt-1 min-h-10 text-sm leading-snug text-apagado">{etapa.tecnica}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-linha pt-3 text-sm tabular-nums sm:grid-cols-4 lg:grid-cols-1 lg:gap-1">
                    <div className="flex justify-between gap-2">
                      <dt className="text-apagado">chamadas</dt>
                      <dd>{fmtInteiro(m.chamadas)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-apagado">p50</dt>
                      <dd>{ativa ? fmtMs(m.p50) : "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-apagado">p95</dt>
                      {/* Cauda bem acima da mediana (mais que o dobro) ganha destaque: é ali que o usuário sente lentidão. */}
                      <dd className={ativa && m.p95 > m.p50 * 2 ? "font-semibold text-sinal" : ""}>{ativa ? fmtMs(m.p95) : "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-apagado">custo</dt>
                      <dd>{fmtUsd(m.custo)}</dd>
                    </div>
                  </dl>
                </Link>
                </div>
              </Fragment>
            );
          })}
        </div>
        {/* Barramento de telemetria: todas as etapas despejam nele. */}
        <div className="relative mt-4">
          <Link
            href="/observabilidade"
            className="flex items-center gap-4 rounded-2xl border border-dashed border-linha-forte bg-white/50 px-4 py-3 pr-10 text-suave hover:border-suave hover:text-texto"
          >
            <span className="h-[2px] w-8 bg-linha-forte" aria-hidden="true" />
            Toda chamada passa por um único cliente, que grava tokens, custo e latência na telemetria lida pelo painel de observabilidade.
          </Link>
          <Explicacao termo="cliente-unico" className="absolute top-1/2 right-3 -translate-y-1/2" />
        </div>
      </Secao>

      {semDados && (
        <div className="mb-12">
          <Aviso titulo="Nenhuma chamada registrada ainda">
            Comece pela <Link href="/rag" className="text-texto underline underline-offset-4">Busca e RAG</Link>: indexe a base e
            faça a primeira pergunta. A linha de processo acende conforme as etapas rodam.
          </Aviso>
        </div>
      )}

      {t && painel?.configurado && (
        <Secao titulo={`Últimos ${painel.periodoDias} dias`}>
          <FaixaIndicadores>
            <Indicador rotulo="Custo" termo="custo" valor={fmtUsd(t.custoUsd)} detalhe={`${fmtInteiro(t.chamadas)} chamadas`} />
            <Indicador rotulo="Tokens" termo="tokens" valor={fmtInteiro(t.tokens)} detalhe={`${fmtInteiro(t.tokensSaida)} de saída`} />
            <Indicador rotulo="Latência p50" termo="percentis" valor={fmtMs(t.p50)} detalhe={`p95 ${fmtMs(t.p95)}`} />
            <Indicador
              rotulo="Nota do juiz"
              termo="llm-juiz"
              valor={painel.qualidade.nota === null ? "—" : `${fmtDecimal(painel.qualidade.nota, 1)} / 5`}
              detalhe={`${painel.qualidade.julgamentos} respostas avaliadas`}
            />
            <Indicador
              rotulo="Erros"
              termo="erros"
              valor={fmtInteiro(t.erros)}
              estado={t.erros > 0 ? "alarme" : undefined}
              detalhe={t.chamadas ? `${fmtDecimal((t.erros / t.chamadas) * 100, 1)}% das chamadas` : undefined}
            />
          </FaixaIndicadores>
        </Secao>
      )}

      <Secao titulo="Módulos" descricao="Cada técnica é um módulo independente, com página, rota de API e código próprios.">
        <ul className="divide-y divide-linha border-y border-linha">
          {MODULOS.map((m) => (
            <li key={m.href} className="relative">
              <Explicacao termo={m.termo} className="absolute top-[26px] left-0 z-10" />
              <Link href={m.href} className="group grid gap-1 py-5 pl-7 md:grid-cols-[240px_1fr] md:gap-8">
                <span className="text-xl font-semibold group-hover:text-sinal">{m.nome}</span>
                <span>
                  <span className="block leading-relaxed">{m.mostra}</span>
                  <span className="mt-1 block text-sm text-apagado">{m.destaque}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Secao>
    </>
  );
}
