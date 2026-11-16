"use client";

import { useId } from "react";

/**
 * Ícone do app, no formato de ícone do iPhone: quadrado arredondado em azul forte
 * com uma rede de nós, que lembra um modelo de IA e as conexões entre as etapas.
 * É um SVG só, então a versão grande da abertura e a pequena do trilho são o
 * mesmo desenho em escalas diferentes: o pouso encaixa exato quando uma é trocada pela outra.
 */
export function IconeApp({ tamanho = 36 }: { tamanho?: number }) {
  const id = useId();
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden="true" className="block">
      <defs>
        <linearGradient id={`${id}-fundo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2F63F0" />
          <stop offset="1" stopColor="#1A44C2" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}-fundo)`} />
      <rect x="0.5" y="0.5" width="63" height="63" rx="14.5" fill="none" stroke="rgb(255 255 255 / 0.22)" />
      <g stroke="#fff" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round">
        <line x1="19" y1="20" x2="45" y2="20" />
        <line x1="19" y1="20" x2="32" y2="44" />
        <line x1="45" y1="20" x2="32" y2="44" />
        <line x1="32" y1="44" x2="32" y2="30" />
      </g>
      <g fill="#fff">
        <circle cx="19" cy="20" r="5" />
        <circle cx="45" cy="20" r="5" />
        <circle cx="32" cy="44" r="5.5" />
        <circle cx="32" cy="30" r="3.5" />
      </g>
    </svg>
  );
}
