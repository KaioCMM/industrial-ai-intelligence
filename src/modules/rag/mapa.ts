import "server-only";
import { obterSupabase } from "@/core/supabase";
import type { MapaEmbeddings } from "./tipos";

// Mapa dos embeddings: cada trecho tem 1.536 números; para desenhar na tela, o vetor
// é projetado em 2 dimensões por PCA (análise de componentes principais): os dois eixos
// em que os vetores mais variam. Pontos próximos no mapa tendem a ter significado
// parecido, mas espremer 1.536 dimensões em 2 perde informação: a distância exata
// continua sendo a do banco.
//
// PCA por iteração de potência, em TypeScript, sem biblioteca: são só 2 componentes
// de uma matriz de 843 × 1.536, e a conta leva menos de um segundo.
// A projeção é calculada uma vez e guardada em memória; reindexar a base invalida.

const ITERACOES = 60;

interface Projecao {
  mapa: MapaEmbeddings;
  media: Float64Array;
  eixos: [Float64Array, Float64Array];
}

let cache: Promise<Projecao> | null = null;

export function invalidarMapa() {
  cache = null;
}

function normalizar(v: Float64Array) {
  let soma = 0;
  for (let i = 0; i < v.length; i++) soma += v[i] * v[i];
  const n = Math.sqrt(soma) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

/** Próxima componente principal, ortogonal às já encontradas. X já vem centralizada (n × d). */
function componentePrincipal(X: Float64Array, n: number, d: number, anteriores: Float64Array[]): Float64Array {
  // Vetor inicial determinístico: o mapa sai igual a cada cálculo.
  let v = normalizar(Float64Array.from({ length: d }, (_, i) => Math.sin(i * 12.9898 + anteriores.length * 78.233) + 0.01));
  const xv = new Float64Array(n);
  for (let it = 0; it < ITERACOES; it++) {
    for (let r = 0; r < n; r++) {
      let s = 0;
      const base = r * d;
      for (let c = 0; c < d; c++) s += X[base + c] * v[c];
      xv[r] = s;
    }
    const w = new Float64Array(d);
    for (let r = 0; r < n; r++) {
      const f = xv[r];
      const base = r * d;
      for (let c = 0; c < d; c++) w[c] += X[base + c] * f;
    }
    for (const a of anteriores) {
      let dot = 0;
      for (let c = 0; c < d; c++) dot += w[c] * a[c];
      for (let c = 0; c < d; c++) w[c] -= dot * a[c];
    }
    normalizar(w);
    let mudanca = 0;
    for (let c = 0; c < d; c++) mudanca += Math.abs(w[c] - v[c]);
    v = w;
    if (mudanca < 1e-7) break;
  }
  // Fixa o sinal (o maior componente positivo), senão o mapa pode aparecer espelhado entre cálculos.
  let maior = 0;
  for (let c = 1; c < d; c++) if (Math.abs(v[c]) > Math.abs(v[maior])) maior = c;
  if (v[maior] < 0) for (let c = 0; c < d; c++) v[c] = -v[c];
  return v;
}

interface LinhaDocumento {
  id: number;
  colecao: string;
  fonte: string;
  titulo: string;
  conteudo: string;
  embedding: string;
}

async function calcular(): Promise<Projecao> {
  const supabase = obterSupabase();
  const linhas: LinhaDocumento[] = [];
  // O Supabase devolve no máximo 1.000 linhas por consulta: lê em páginas.
  for (let inicio = 0; ; inicio += 1000) {
    const { data, error } = await supabase
      .from("documentos")
      .select("id, colecao, fonte, titulo, conteudo, embedding")
      .order("id")
      .range(inicio, inicio + 999);
    if (error) throw new Error(`Falha ao ler os embeddings: ${error.message}`);
    linhas.push(...(data as LinhaDocumento[]));
    if (data.length < 1000) break;
  }
  if (linhas.length < 3) throw new Error("A base tem poucos trechos para montar o mapa. Indexe a base primeiro.");

  // O pgvector chega pela API como texto "[0.1,0.2,...]".
  const vetores = linhas.map((l) => JSON.parse(l.embedding) as number[]);
  const n = vetores.length;
  const d = vetores[0].length;

  const media = new Float64Array(d);
  for (const v of vetores) for (let c = 0; c < d; c++) media[c] += v[c] / n;
  const X = new Float64Array(n * d);
  let variacaoTotal = 0;
  vetores.forEach((v, r) => {
    for (let c = 0; c < d; c++) {
      const x = v[c] - media[c];
      X[r * d + c] = x;
      variacaoTotal += x * x;
    }
  });

  const eixo1 = componentePrincipal(X, n, d, []);
  const eixo2 = componentePrincipal(X, n, d, [eixo1]);

  let var1 = 0;
  let var2 = 0;
  const pontos = linhas.map((l, r) => {
    let x = 0;
    let y = 0;
    const base = r * d;
    for (let c = 0; c < d; c++) {
      x += X[base + c] * eixo1[c];
      y += X[base + c] * eixo2[c];
    }
    var1 += x * x;
    var2 += y * y;
    return {
      id: l.id,
      colecao: l.colecao,
      fonte: l.fonte,
      titulo: l.titulo,
      previa: l.conteudo.slice(0, 180),
      x,
      y,
    };
  });

  return {
    media,
    eixos: [eixo1, eixo2],
    mapa: { pontos, variancia: [var1 / variacaoTotal, var2 / variacaoTotal] },
  };
}

function projecao(): Promise<Projecao> {
  cache ??= calcular().catch((e) => {
    cache = null; // não guarda a falha: a próxima chamada tenta de novo
    throw e;
  });
  return cache;
}

export async function obterMapa(): Promise<MapaEmbeddings> {
  return (await projecao()).mapa;
}

/** Projeta um vetor novo (a pergunta) nos mesmos dois eixos do mapa. */
export async function projetarNoMapa(vetor: number[]): Promise<[number, number]> {
  const { media, eixos } = await projecao();
  let x = 0;
  let y = 0;
  for (let c = 0; c < vetor.length; c++) {
    const v = vetor[c] - media[c];
    x += v * eixos[0][c];
    y += v * eixos[1][c];
  }
  return [x, y];
}
