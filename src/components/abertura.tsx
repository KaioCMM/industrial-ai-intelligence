"use client";

import { useRef, useState } from "react";
import { IconeApp } from "./marca";
import { Botao, Lampada } from "./ui";

/*
 * Abertura do sistema, adaptada da abertura do Loc Polaris.
 *   1. O ícone do app fica no centro da tela, com o nome e o botão Iniciar.
 *   2. Iniciar confere o sistema de verdade (chave da OpenAI, Supabase, base vetorial),
 *      sem nenhuma chamada paga.
 *   3. O título e os botões somem ali mesmo, e só o ícone voa até a marca do trilho:
 *      pega impulso, sobe em arco girando e cai em cima dela.
 *   4. No pouso, a marca pulsa e o resto do sistema surge em sequência.
 * O sistema já está montado por baixo durante toda a abertura ([data-abrindo] o esconde):
 * é isso que dá um alvo exato para medir o pouso.
 */

const DURACAO_VOO = 1000;
const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Ponto = { x: number; y: number; w: number };
function centro(el: Element): Ponto {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
}
const visivel = (el: Element | null): el is HTMLElement => !!el && el.getClientRects().length > 0;

function acharPouso(casca: HTMLElement): HTMLElement | null {
  const alvo = casca.querySelector<HTMLElement>("[data-marca-icone]");
  return visivel(alvo) ? alvo : null;
}

function pulsar(caixa: HTMLElement) {
  caixa.animate(
    [{ transform: "scale(1)" }, { transform: "scale(.88)", offset: 0.25 }, { transform: "scale(1.1)", offset: 0.6 }, { transform: "scale(1)" }],
    { duration: 480, easing: "ease-out" },
  );
  caixa.animate(
    [{ boxShadow: "0 0 0 0 rgb(29 78 216 / 0.5)" }, { boxShadow: "0 0 0 16px rgb(29 78 216 / 0)" }],
    { duration: 650, easing: "ease-out" },
  );
}

/** Depois do pouso: o trilho ganha o vidro, depois o nome, os itens e por fim o conteúdo, bloco a bloco. */
function surgir(casca: HTMLElement) {
  const suave = "cubic-bezier(.16,1,.3,1)";
  const trilho = casca.querySelector<HTMLElement>("aside.trilho");
  if (trilho) {
    trilho.animate([{ backgroundColor: "transparent", borderColor: "transparent", boxShadow: "none" }, {}], { duration: 420, easing: "ease" });
    trilho
      .querySelector("[data-marca-nome]")
      ?.animate([{ opacity: 0, transform: "translateX(-8px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 120, easing: suave, fill: "backwards" });
    [...trilho.querySelectorAll("nav a, [data-some] > *")].slice(0, 12).forEach((el, i) =>
      el.animate([{ opacity: 0, transform: "translateX(-10px)" }, { opacity: 1, transform: "none" }], {
        duration: 380,
        delay: 100 + i * 35,
        easing: suave,
        fill: "backwards",
      }),
    );
  }
  const conteudo = casca.querySelector("#conteudo > div");
  if (conteudo) {
    [...conteudo.children].slice(0, 8).forEach((el, i) =>
      el.animate([{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }], {
        duration: 520,
        delay: 200 + i * 70,
        easing: suave,
        fill: "backwards",
      }),
    );
  }
}

async function voar(camada: HTMLElement, casca: HTMLElement, icone: HTMLElement) {
  const pouso = acharPouso(casca);
  camada.classList.add("voando");

  if (!pouso || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    await icone.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(.6)" }], { duration: 300, fill: "forwards" }).finished;
    casca.removeAttribute("data-abrindo");
    camada.style.display = "none";
    return;
  }

  // O ícone passa a ficar preso à tela: se o layout por baixo se mexer durante o voo, o ponto de partida não anda.
  const inicio = icone.getBoundingClientRect();
  Object.assign(icone.style, { position: "fixed", left: `${inicio.left}px`, top: `${inicio.top}px`, margin: "0" });

  const a = centro(icone);
  const b = centro(pouso);
  const s = b.w / a.w;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const alto = Math.min(170, Math.abs(dx) * 0.2);
  await icone.animate(
    [
      { transform: "translate(0px, 0px) scale(1) rotate(0deg)", easing: "cubic-bezier(.5,0,.75,.4)" },
      { transform: "translate(0px, 10px) scale(.92) rotate(-14deg)", offset: 0.1, easing: "cubic-bezier(.3,0,.5,1)" },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - alto}px) scale(${(1 + s) / 2}) rotate(200deg)`, offset: 0.5, easing: "cubic-bezier(.3,.5,.5,1)" },
      { transform: `translate(${dx}px, ${dy - 26}px) scale(${s * 1.15}) rotate(340deg)`, offset: 0.84, easing: "cubic-bezier(.6,0,1,.6)" },
      { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(360deg)` },
    ],
    { duration: DURACAO_VOO, fill: "forwards" },
  ).finished;

  // Troca no mesmo quadro: o ícone que voou some e a marca do trilho aparece no lugar exato, nunca os dois juntos.
  casca.removeAttribute("data-abrindo");
  camada.style.display = "none";
  pulsar(pouso);
  surgir(casca);
  await esperar(200);
}

type Estado = "aguardando" | "verificando" | "ok" | "falha";
interface Checagem {
  nome: string;
  estado: Estado;
  detalhe?: string;
}
const INICIAIS: Checagem[] = [
  { nome: "Chave da OpenAI", estado: "aguardando" },
  { nome: "Banco Supabase", estado: "aguardando" },
  { nome: "Base vetorial", estado: "aguardando" },
];

export function Abertura({ aoTerminar }: { aoTerminar: () => void }) {
  const camada = useRef<HTMLDivElement>(null);
  const icone = useRef<HTMLSpanElement>(null);
  const [checagens, setChecagens] = useState<Checagem[]>(INICIAIS);
  const [fase, setFase] = useState<"parado" | "verificando" | "pendente">("parado");

  const marcar = (i: number, estado: Estado, detalhe?: string) =>
    setChecagens((cs) => cs.map((c, j) => (j === i ? { ...c, estado, detalhe } : c)));

  async function abrir() {
    const el = camada.current;
    const voadora = icone.current;
    const casca = el?.closest<HTMLElement>("[data-casca]");
    if (!el || !voadora || !casca) return aoTerminar();
    try {
      await voar(el, casca, voadora);
    } finally {
      // Se algo falhar no meio, o sistema nunca fica escondido.
      casca.removeAttribute("data-abrindo");
      aoTerminar();
    }
  }

  async function iniciar() {
    setFase("verificando");
    setChecagens(INICIAIS);
    let falhou = false;

    const status = await fetch("/api/observabilidade/gasto", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    marcar(0, "verificando");
    await esperar(300);
    if (status?.openaiConfigurada) marcar(0, "ok");
    else {
      marcar(0, "falha", "Defina OPENAI_API_KEY no .env.local");
      falhou = true;
    }

    marcar(1, "verificando");
    await esperar(300);
    let trechos = 0;
    if (status?.configurado) {
      const base = await fetch("/api/rag/base", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
      if (base && typeof base.trechos === "number") {
        marcar(1, "ok");
        trechos = base.trechos;
      } else {
        marcar(1, "falha", base?.erro ?? "O Supabase não respondeu");
        falhou = true;
      }
    } else {
      marcar(1, "falha", "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
      falhou = true;
    }

    marcar(2, "verificando");
    await esperar(300);
    if (trechos > 0) marcar(2, "ok", `${trechos} trechos indexados`);
    else {
      marcar(2, "falha", "Vazia: indexe a base em Busca e RAG");
      falhou = true;
    }

    if (falhou) return setFase("pendente");
    await esperar(350);
    await abrir();
  }

  const lampada = (e: Estado) => (e === "ok" ? "normal" : e === "falha" ? "alarme" : e === "verificando" ? "ativo" : "apagado");

  return (
    <div ref={camada} className="abertura">
      <div className="flex w-full max-w-[600px] flex-col items-center text-center">
        <span className="block size-[104px]">
          <span ref={icone} className="abertura-icone">
            <IconeApp tamanho={104} />
          </span>
        </span>

        <div className="abertura-sai flex flex-col items-center">
          <h1 className="mt-8 text-4xl font-semibold tracking-tight sm:text-5xl">Industrial AI Intelligence</h1>
          <p className="mt-4 max-w-[40ch] text-lg leading-relaxed text-suave">
            Assistente de IA para projetos de capital: lê cronograma, riscos, relatórios e normas para antecipar atraso e estouro de
            custo, mostrando quanto custa cada resposta e se ela acertou.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Botao onClick={iniciar} carregando={fase === "verificando"} className="min-h-12 px-12 text-base">
              Iniciar
            </Botao>
            {fase === "pendente" && (
              <Botao variante="secundario" onClick={abrir} className="min-h-12">
                Abrir mesmo assim
              </Botao>
            )}
          </div>

          {fase !== "parado" && (
            <ul className="vidro mt-8 w-full max-w-[440px] space-y-3 rounded-2xl px-5 py-4 text-left" aria-live="polite">
              {checagens.map((c) => (
                <li key={c.nome} className="flex items-baseline gap-3">
                  <span className="-translate-y-0.5">
                    <Lampada estado={lampada(c.estado)} />
                  </span>
                  <span>
                    <span className={`block ${c.estado === "aguardando" ? "text-apagado" : ""}`}>{c.nome}</span>
                    {c.detalhe && (
                      <span className={`block text-sm ${c.estado === "falha" ? "text-alarme" : "text-apagado"}`}>{c.detalhe}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
