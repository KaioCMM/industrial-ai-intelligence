"use client";

import { useEffect, useRef, useState } from "react";
import { chamarApi } from "@/lib/api";
import { fmtPct } from "@/lib/formato";
import type { MapaEmbeddings as Mapa, PontoMapa } from "@/modules/rag/tipos";

// Mapa dos embeddings: cada trecho da base é um ponto (projeção PCA dos 1.536 números
// em 2D, calculada no servidor). Depois de uma pergunta, ela aparece como um ponto novo,
// ligado aos trechos que a busca trouxe: dá para ver a busca "andando" pelo conhecimento.

const CORES: Record<string, string> = {
  projeto: "29, 78, 216",
  conceitos: "13, 148, 136",
  normas: "100, 116, 139",
};
const NOMES: Record<string, string> = { projeto: "Projeto", conceitos: "Conceitos", normas: "NRs" };
const ALTURA = 440;
const MARGEM = 28;

interface Destaque {
  pergunta: [number, number] | null;
  candidatos: number[];
  contexto: number[];
}

export function MapaEmbeddings({ destaque }: { destaque: Destaque | null }) {
  const [mapa, setMapa] = useState<Mapa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [foco, setFoco] = useState<{ ponto: PontoMapa; left: number; top: number } | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  // Posição na tela de cada ponto, para achar o mais perto do mouse sem recalcular a escala.
  const posicoes = useRef<{ ponto: PontoMapa; px: number; py: number }[]>([]);

  useEffect(() => {
    chamarApi<Mapa>("/api/rag/mapa").then(setMapa).catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    const canvas = tela.current;
    const ctx = canvas?.getContext("2d");
    if (!mapa || !canvas || !ctx || !caixa.current) return;

    const desenhar = () => {
      const largura = caixa.current!.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = largura * dpr;
      canvas.height = ALTURA * dpr;
      canvas.style.width = `${largura}px`;
      canvas.style.height = `${ALTURA}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, largura, ALTURA);

      // Escala comum aos dois eixos: o mapa não é esticado, então distância continua sendo distância.
      const xs = mapa.pontos.map((p) => p.x).concat(destaque?.pergunta ? [destaque.pergunta[0]] : []);
      const ys = mapa.pontos.map((p) => p.y).concat(destaque?.pergunta ? [destaque.pergunta[1]] : []);
      const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const escala = Math.min((largura - MARGEM * 2) / (maxX - minX || 1), (ALTURA - MARGEM * 2) / (maxY - minY || 1));
      const ox = (largura - (maxX - minX) * escala) / 2;
      const oy = (ALTURA - (maxY - minY) * escala) / 2;
      const px = (x: number) => ox + (x - minX) * escala;
      const py = (y: number) => ALTURA - (oy + (y - minY) * escala);

      const candidatos = new Set(destaque?.candidatos ?? []);
      const contexto = new Set(destaque?.contexto ?? []);
      const algumDestaque = candidatos.size > 0;
      posicoes.current = mapa.pontos.map((p) => ({ ponto: p, px: px(p.x), py: py(p.y) }));

      // Linhas da pergunta até os trechos encontrados: o desenho de grafo do mapa.
      if (destaque?.pergunta) {
        const [qx, qy] = [px(destaque.pergunta[0]), py(destaque.pergunta[1])];
        for (const { ponto, px: x, py: y } of posicoes.current) {
          if (!candidatos.has(ponto.id)) continue;
          const noContexto = contexto.has(ponto.id);
          ctx.strokeStyle = noContexto ? "rgba(29, 78, 216, 0.7)" : "rgba(29, 78, 216, 0.18)";
          ctx.lineWidth = noContexto ? 1.6 : 1;
          ctx.beginPath();
          ctx.moveTo(qx, qy);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }

      // Pontos comuns primeiro e destacados por cima.
      const ordem = [...posicoes.current].sort((a, b) => Number(candidatos.has(a.ponto.id)) - Number(candidatos.has(b.ponto.id)));
      for (const { ponto, px: x, py: y } of ordem) {
        const cor = CORES[ponto.colecao] ?? CORES.normas;
        const ehCandidato = candidatos.has(ponto.id);
        const ehContexto = contexto.has(ponto.id);
        const alfa = !algumDestaque ? 0.6 : ehCandidato ? 0.95 : 0.18;
        ctx.fillStyle = `rgba(${cor}, ${alfa})`;
        ctx.beginPath();
        ctx.arc(x, y, ehContexto ? 5.5 : ehCandidato ? 4 : 2.6, 0, Math.PI * 2);
        ctx.fill();
        if (ehContexto) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      if (destaque?.pergunta) {
        const [qx, qy] = [px(destaque.pergunta[0]), py(destaque.pergunta[1])];
        ctx.fillStyle = "#1d4ed8";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Losango: a pergunta não é um trecho da base, então tem outra forma.
        ctx.moveTo(qx, qy - 8);
        ctx.lineTo(qx + 8, qy);
        ctx.lineTo(qx, qy + 8);
        ctx.lineTo(qx - 8, qy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.font = "600 12px var(--font-geist), sans-serif";
        ctx.fillStyle = "#0e1525";
        ctx.fillText("sua pergunta", qx + 12, qy - 10);
      }
    };

    desenhar();
    const observador = new ResizeObserver(desenhar);
    observador.observe(caixa.current);
    return () => observador.disconnect();
  }, [mapa, destaque]);

  function aoMover(e: React.MouseEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    let melhor: { ponto: PontoMapa; px: number; py: number } | null = null;
    let menor = 10 * 10; // só reage até 10 px de distância
    for (const p of posicoes.current) {
      const d = (p.px - mx) ** 2 + (p.py - my) ** 2;
      if (d < menor) {
        menor = d;
        melhor = p;
      }
    }
    // A posição do cartão é calculada aqui, no evento: durante a renderização o React não deixa ler refs.
    setFoco(
      melhor
        ? { ponto: melhor.ponto, left: Math.min(melhor.px + 14, r.width - 300), top: Math.max(melhor.py - 20, 8) }
        : null,
    );
  }

  if (erro) return <p className="text-suave">Não deu para montar o mapa: {erro}</p>;

  const contagem = mapa?.pontos.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.colecao]: (acc[p.colecao] ?? 0) + 1 }), {});

  return (
    <div>
      <div ref={caixa} className="relative overflow-hidden rounded-2xl border border-linha bg-painel">
        {!mapa && <p className="px-5 py-5 text-suave">Projetando os embeddings…</p>}
        <canvas
          ref={tela}
          role="img"
          aria-label="Mapa dos trechos da base projetados em duas dimensões, com a pergunta ligada aos trechos encontrados"
          onMouseMove={aoMover}
          onMouseLeave={() => setFoco(null)}
          className="block"
        />
        {foco && (
          <div
            className="vidro pointer-events-none absolute z-10 w-72 rounded-xl px-3 py-2.5 text-[13px] leading-snug"
            style={{ left: foco.left, top: foco.top }}
          >
            <p className="font-semibold">{foco.ponto.fonte}</p>
            <p className="text-suave">{foco.ponto.titulo}</p>
            <p className="mt-1.5 text-texto">{foco.ponto.previa}…</p>
          </div>
        )}
      </div>
      {mapa && (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-suave">
          {Object.entries(NOMES).map(([colecao, nome]) => (
            <span key={colecao} className="inline-flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full" style={{ background: `rgb(${CORES[colecao]})` }} aria-hidden="true" />
              {nome} <span className="text-apagado">({contagem?.[colecao] ?? 0})</span>
            </span>
          ))}
          <span className="text-apagado">
            Os dois eixos explicam {fmtPct(mapa.variancia[0] + mapa.variancia[1])} da variação dos vetores: o mapa mostra grupos, não a
            distância exata.
          </span>
        </div>
      )}
    </div>
  );
}
