"use client";

import { useEffect, useRef } from "react";

// Grade decorativa que nasce no canto inferior direito da tela e vai sumindo na
// diagonal. Uma "cobrinha" de quadrados azuis passeia só pela parte visível,
// deixando um rastro leve que apaga devagar. É só ambiente: sem controle, sem
// placar e sem marcar para onde ela vai.
//
// Canvas e não centenas de <div>: redesenhar as células a cada passo no DOM
// custaria layout; no canvas é uma pintura só.

// Quadrados encostados: a grade é feita de linhas, e cada célula ocupa o quadrado inteiro.
const PASSO = 28;
const INTERVALO_MS = 160;
const COMPRIMENTO_INICIAL = 5;
const COMPRIMENTO_MAXIMO = 9;
/**
 * Alcance da grade a partir do canto inferior direito, em pixels. Precisa bater com o
 * raio da máscara no CSS (.grade-cobrinha). Em pixels, e não em fração da tela: numa
 * tela larga a diagonal é enorme e a grade se espalharia pela página inteira.
 */
const ALCANCE_PX = 900;
/** A cobrinha anda só até aqui, onde a grade ainda é bem visível. */
const ALCANCE_DA_COBRA_PX = 480;
const AZUL = "29, 78, 216";

type Ponto = [number, number];

export function GradeCobrinha() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let colunas = 0;
    let linhas = 0;
    // Deslocamentos que encostam a última coluna na borda direita e a última linha no rodapé.
    let deslocX = 0;
    let deslocY = 0;
    let largura = 0;
    let altura = 0;
    let cobra: Ponto[] = [];
    let direcao: Ponto = [1, 0];
    let alvo: Ponto = [0, 0];
    const rastro = new Map<string, number>();

    // Distância do centro de uma célula até o canto inferior direito, em pixels.
    const distancia = ([x, y]: Ponto) => Math.hypot((colunas - x - 0.5) * PASSO, (linhas - y - 0.5) * PASSO);
    const naArea = (p: Ponto) => p[0] >= 0 && p[1] >= 0 && p[0] < colunas && p[1] < linhas && distancia(p) < ALCANCE_DA_COBRA_PX;
    const ocupado = ([x, y]: Ponto) => cobra.some(([a, b]) => a === x && b === y);

    // O destino é interno: só dá rumo à cobrinha e não aparece na tela.
    function novoAlvo() {
      for (let tentativa = 0; tentativa < 80; tentativa++) {
        const p: Ponto = [Math.floor(Math.random() * colunas), Math.floor(Math.random() * linhas)];
        if (naArea(p) && !ocupado(p)) return (alvo = p);
      }
    }

    function preparar() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas!.getBoundingClientRect();
      largura = width;
      altura = height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      colunas = Math.max(6, Math.ceil(width / PASSO));
      deslocX = width - colunas * PASSO;
      linhas = Math.max(6, Math.ceil(height / PASSO));
      deslocY = height - linhas * PASSO;
      const inicio: Ponto = [colunas - 4, linhas - 4];
      cobra = Array.from({ length: COMPRIMENTO_INICIAL }, (_, i) => [inicio[0] + Math.min(i, 3), inicio[1]] as Ponto);
      direcao = [-1, 0];
      rastro.clear();
      novoAlvo();
    }

    // Vai na direção do destino, com um pouco de acaso; nunca volta sobre si
    // mesma nem sai da área visível.
    function andar() {
      const [cx, cy] = cobra[0];
      const opcoes = (
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as Ponto[]
      ).filter(([dx, dy]) => !(dx === -direcao[0] && dy === -direcao[1]) && naArea([cx + dx, cy + dy]) && !ocupado([cx + dx, cy + dy]));
      if (opcoes.length === 0) return preparar();

      const ate = ([dx, dy]: Ponto) => Math.abs(cx + dx - alvo[0]) + Math.abs(cy + dy - alvo[1]);
      opcoes.sort((a, b) => ate(a) - ate(b));
      direcao = Math.random() < 0.75 ? opcoes[0] : opcoes[Math.floor(Math.random() * opcoes.length)];

      const cabeca: Ponto = [cx + direcao[0], cy + direcao[1]];
      cobra.unshift(cabeca);
      if (cabeca[0] === alvo[0] && cabeca[1] === alvo[1]) {
        if (cobra.length > COMPRIMENTO_MAXIMO) cobra = cobra.slice(0, COMPRIMENTO_INICIAL);
        novoAlvo();
      } else {
        rastro.set(cobra.pop()!.join(","), 1);
      }
    }

    // Preenche a célula inteira, deixando só a linha da grade (1 px) aparecendo entre as vizinhas.
    function celula(x: number, y: number, alfa: number) {
      ctx!.fillStyle = `rgba(${AZUL}, ${alfa})`;
      ctx!.fillRect(x * PASSO + 1, y * PASSO + 1, PASSO - 1, PASSO - 1);
    }

    function linhasDaGrade() {
      ctx!.strokeStyle = `rgba(${AZUL}, 0.14)`;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      // +0.5 alinha a linha de 1 px ao pixel, senão ela borra em 2 px.
      for (let x = 0; x <= colunas; x++) {
        ctx!.moveTo(x * PASSO + 0.5, 0);
        ctx!.lineTo(x * PASSO + 0.5, linhas * PASSO);
      }
      for (let y = 0; y <= linhas; y++) {
        ctx!.moveTo(0, y * PASSO + 0.5);
        ctx!.lineTo(colunas * PASSO, y * PASSO + 0.5);
      }
      ctx!.stroke();
    }

    function desenhar() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.save();
      ctx!.translate(deslocX, deslocY);
      linhasDaGrade();
      // Rastro só dentro do alcance: fora dele a máscara apagaria de qualquer jeito.
      for (let x = 0; x < colunas; x++) {
        for (let y = 0; y < linhas; y++) {
          if (distancia([x, y]) > ALCANCE_PX) continue;
          const chave = `${x},${y}`;
          const brilho = rastro.get(chave) ?? 0;
          if (brilho === 0) continue;
          celula(x, y, brilho * 0.16);
          if (brilho > 0.03) rastro.set(chave, brilho * 0.86);
          else rastro.delete(chave);
        }
      }
      cobra.forEach(([x, y], i) => celula(x, y, Math.max(0.18, 0.8 - i * 0.08)));
      ctx!.restore();

      // Esmaecimento desenhado dentro do canvas, a partir do canto inferior direito.
      // Antes era uma mask-image de CSS: com ela o navegador recompunha a grade a cada
      // repintura da página (passar o mouse em links e textos), e a grade piscava.
      const esmaecer = ctx!.createRadialGradient(largura, altura, 0, largura, altura, ALCANCE_PX);
      esmaecer.addColorStop(0, "rgba(0,0,0,1)");
      esmaecer.addColorStop(0.35, "rgba(0,0,0,0.6)");
      esmaecer.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.globalCompositeOperation = "destination-in";
      ctx!.fillStyle = esmaecer;
      ctx!.fillRect(0, 0, largura, altura);
      ctx!.globalCompositeOperation = "source-over";
    }

    preparar();
    desenhar();

    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let relogio: ReturnType<typeof setInterval> | null = null;
    const ligar = () => {
      if (parado || relogio || document.hidden) return;
      relogio = setInterval(() => {
        andar();
        desenhar();
      }, INTERVALO_MS);
    };
    const desligar = () => {
      if (relogio) clearInterval(relogio);
      relogio = null;
    };
    // Pausa com a aba em segundo plano: não gasta CPU com o que ninguém está vendo.
    const visibilidade = () => (document.hidden ? desligar() : ligar());
    const redimensionar = () => {
      preparar();
      desenhar();
    };

    ligar();
    document.addEventListener("visibilitychange", visibilidade);
    window.addEventListener("resize", redimensionar);
    return () => {
      desligar();
      document.removeEventListener("visibilitychange", visibilidade);
      window.removeEventListener("resize", redimensionar);
    };
  }, []);

  // O canvas cobre só o canto que a grade ocupa (até 900 × 900 px), não a tela toda:
  // menos área para o navegador compor quando o resto da página repinta.
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed right-0 bottom-0 z-0 hidden h-[min(900px,100dvh)] w-[min(900px,100vw)] [contain:strict] md:block"
    />
  );
}
