"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fmtUsd } from "@/lib/formato";
import { IconeApp } from "./marca";
import { Medidor } from "./ui";

export const MODULOS = [
  { href: "/", nome: "Visão geral", tecnica: "O sistema inteiro numa tela" },
  { href: "/rag", nome: "Busca e RAG", tecnica: "Vetorial, lexical, híbrida e reranking" },
  { href: "/roteamento", nome: "Roteamento de modelos", tecnica: "O modelo certo para cada pergunta" },
  { href: "/ferramentas", nome: "Function calling", tecnica: "O modelo consulta cronograma e custos" },
  { href: "/avaliacao", nome: "Avaliação com juiz", tecnica: "LLM-as-a-Judge com rubrica" },
  { href: "/observabilidade", nome: "Observabilidade", tecnica: "Tokens, custo, latência e qualidade" },
] as const;

interface Gasto {
  configurado: boolean;
  openaiConfigurada: boolean;
  gastoHojeUsd: number;
  tetoUsd: number;
}

export function Trilho() {
  const caminho = usePathname();
  const [gasto, setGasto] = useState<Gasto | null>(null);
  // Teto inválido ou gasto ilegível bloqueiam as chamadas: o trilho diz o motivo, em vez
  // de ficar em "Lendo o gasto do dia…" para sempre.
  const [erroGasto, setErroGasto] = useState<string | null>(null);

  const atualizar = useCallback(() => {
    fetch("/api/observabilidade/gasto", { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json.erro ?? `O gasto do dia não pôde ser lido (status ${r.status}).`);
        setGasto(json);
        setErroGasto(null);
      })
      .catch((e) => setErroGasto(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    atualizar();
    window.addEventListener("telemetria:atualizada", atualizar);
    return () => window.removeEventListener("telemetria:atualizada", atualizar);
  }, [atualizar, caminho]);

  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));

  return (
    // Vidro solto das bordas, como no Loc Polaris: no celular vira uma barra no topo.
    <aside className="trilho vidro sticky top-2 z-30 m-2 rounded-3xl md:top-3 md:m-3 md:flex md:h-[calc(100dvh-24px)] md:flex-col">
      <div className="px-4 pt-4 pb-3 md:px-5 md:pt-6 md:pb-6">
        <Link href="/" className="flex items-center gap-3 rounded-xl">
          <span data-marca-icone className="block rounded-[10px]">
            <IconeApp tamanho={38} />
          </span>
          <span data-marca-nome className="text-[15px] leading-tight font-semibold tracking-tight">
            Industrial AI
            <br />
            Intelligence
          </span>
        </Link>
      </div>

      <nav aria-label="Módulos" data-some className="md:flex-1 md:overflow-y-auto">
        <ul className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-0.5 md:overflow-visible md:pb-0">
          {MODULOS.map((m) => {
            const atual = ativo(m.href);
            return (
              <li key={m.href} className="shrink-0">
                <Link
                  href={m.href}
                  aria-current={atual ? "page" : undefined}
                  className={`block rounded-2xl px-3 py-2 transition-colors md:py-2.5 ${
                    atual ? "bg-white/90 text-texto shadow-[0_1px_3px_rgb(14_21_37/0.08)]" : "text-suave hover:bg-white/50 hover:text-texto"
                  }`}
                >
                  <span className={`block text-[15px] whitespace-nowrap ${atual ? "font-semibold text-sinal" : "font-medium"}`}>{m.nome}</span>
                  <span className="hidden text-[13px] text-apagado md:block">{m.tecnica}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div data-some className="hidden px-5 py-5 md:block">
        <div className="rounded-2xl bg-white/60 px-4 py-3">
          {erroGasto ? (
            <p className="text-[13px] text-alarme">{erroGasto}</p>
          ) : gasto?.configurado ? (
            <>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="text-suave">Gasto hoje</span>
                <span className="tabular-nums">
                  {fmtUsd(gasto.gastoHojeUsd)} <span className="text-apagado">de {fmtUsd(gasto.tetoUsd)}</span>
                </span>
              </div>
              <Medidor valor={gasto.gastoHojeUsd} maximo={gasto.tetoUsd} className="mt-2" />
              {!gasto.openaiConfigurada && <p className="mt-2 text-[13px] text-alarme">OPENAI_API_KEY ausente no .env.local.</p>}
            </>
          ) : (
            <p className="text-[13px] text-apagado">
              {gasto === null ? "Lendo o gasto do dia…" : "Supabase não configurado: sem teto nem telemetria."}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
