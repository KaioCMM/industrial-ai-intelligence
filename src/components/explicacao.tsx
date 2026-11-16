"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GLOSSARIO, type Termo } from "@/lib/glossario";

// Ícone "i" que explica um conceito. Abre ao passar o mouse, ao focar pelo
// teclado ou ao tocar (celular); fecha com Esc, ao sair o mouse ou ao rolar a página.
// O cartão vai para um portal no <body>: dentro de uma tabela com rolagem
// horizontal ele seria cortado pelo overflow do contêiner.

const LARGURA = 340;
const MARGEM = 16;

export function Explicacao({ termo, className = "" }: { termo: Termo; className?: string }) {
  const verbete = GLOSSARIO[termo];
  const id = useId();
  const botao = useRef<HTMLButtonElement>(null);
  const cartao = useRef<HTMLDivElement>(null);
  const fechando = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState<{ left: number; top: number; acima: boolean } | null>(null);

  const posicionar = useCallback(() => {
    const r = botao.current?.getBoundingClientRect();
    if (!r) return;
    const largura = Math.min(LARGURA, window.innerWidth - MARGEM * 2);
    const left = Math.min(Math.max(r.left + r.width / 2 - largura / 2, MARGEM), window.innerWidth - largura - MARGEM);
    const alturaCartao = cartao.current?.offsetHeight ?? 220;
    const acima = r.bottom + 10 + alturaCartao > window.innerHeight && r.top - 10 - alturaCartao > 0;
    setPosicao({ left, top: acima ? r.top - 10 - alturaCartao : r.bottom + 10, acima });
  }, []);

  const abrir = useCallback(() => {
    if (fechando.current) clearTimeout(fechando.current);
    setAberto(true);
  }, []);
  // Pequeno atraso ao fechar: dá tempo de o mouse ir do ícone até o cartão sem ele sumir.
  const fecharDepois = useCallback(() => {
    if (fechando.current) clearTimeout(fechando.current);
    fechando.current = setTimeout(() => setAberto(false), 120);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    posicionar();
    // Reposiciona depois de medir a altura real do cartão.
    const quadro = requestAnimationFrame(posicionar);
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    const fechar = () => setAberto(false);
    window.addEventListener("keydown", tecla);
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
    };
  }, [aberto, posicionar]);

  useEffect(() => () => {
    if (fechando.current) clearTimeout(fechando.current);
  }, []);

  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-label={`O que é: ${verbete.titulo}`}
        aria-describedby={aberto ? id : undefined}
        aria-expanded={aberto}
        onMouseEnter={abrir}
        onMouseLeave={fecharDepois}
        onFocus={abrir}
        onBlur={fecharDepois}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAberto((a) => !a);
        }}
        className={`inline-flex size-[18px] shrink-0 translate-y-[-1px] items-center justify-center rounded-full align-middle text-apagado transition-colors hover:text-sinal focus-visible:text-sinal ${
          aberto ? "text-sinal" : ""
        } ${className}`}
      >
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="10" cy="6.4" r="1.1" fill="currentColor" />
          <path d="M10 9v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>

      {aberto &&
        createPortal(
          <div
            ref={cartao}
            id={id}
            role="tooltip"
            onMouseEnter={abrir}
            onMouseLeave={fecharDepois}
            style={{
              left: posicao?.left ?? -9999,
              top: posicao?.top ?? -9999,
              width: Math.min(LARGURA, typeof window === "undefined" ? LARGURA : window.innerWidth - MARGEM * 2),
            }}
            className="explicacao-cartao vidro fixed z-[70] rounded-2xl px-4 py-3.5 text-left text-texto"
          >
            <p className="text-[14px] leading-snug font-semibold">{verbete.titulo}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-suave">{verbete.oQueE}</p>
            <p className="mt-2.5 border-t border-linha/80 pt-2.5 text-[13px] leading-relaxed text-suave">
              <span className="font-semibold text-sinal">Neste sistema: </span>
              {verbete.aqui}
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
