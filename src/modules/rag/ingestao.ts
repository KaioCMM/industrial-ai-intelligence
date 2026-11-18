import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DIMENSAO_EMBEDDING, MODELOS } from "@/core/config";
import { embeddings } from "@/core/llm";
import { lerEmPaginas, obterSupabase, supabaseConfigurado } from "@/core/supabase";
import type { Rastro } from "@/core/tipos";
import { CORPUS, type Colecao, type DocumentoFonte } from "./corpus";
import { invalidarMapa } from "./mapa";
import type { EstadoBase } from "./tipos";
import { dividirEmTrechos, dividirNorma } from "./trechos";

// Lotes: a API de embeddings aceita muitos textos por chamada, mas um lote
// menor deixa cada requisição curta e um erro no meio não perde tudo.
// O Supabase também recusa corpos muito grandes, e 1536 números por trecho pesam.
const LOTE_EMBEDDING = 96;
const LOTE_INSERCAO = 100;

interface NormaBaixada {
  arquivo: string;
  fonte: string;
  titulo: string;
  url: string;
  obtidoEm: string;
}

const PASTA_NORMAS = path.join(process.cwd(), "dados", "normas");

/** NRs baixadas pelo script scripts/baixar-normas.mjs. Sem o script rodado, a lista vem vazia. */
export async function normasDisponiveis(): Promise<(DocumentoFonte & { url: string })[]> {
  let manifesto: NormaBaixada[];
  try {
    manifesto = JSON.parse(await readFile(path.join(PASTA_NORMAS, "normas.json"), "utf8"));
  } catch {
    return [];
  }
  return Promise.all(
    manifesto.map(async (n) => ({
      colecao: "normas" as Colecao,
      fonte: n.fonte,
      titulo: n.titulo,
      url: n.url,
      conteudo: await readFile(path.join(PASTA_NORMAS, n.arquivo), "utf8"),
    })),
  );
}

export async function ingerirCorpus(rastro: Rastro) {
  const documentos: DocumentoFonte[] = [...CORPUS, ...(await normasDisponiveis())];
  const linhas = documentos.flatMap((doc) =>
    (doc.colecao === "normas" ? dividirNorma(doc.conteudo) : dividirEmTrechos(doc.conteudo)).map((conteudo, indice) => ({
      colecao: doc.colecao,
      fonte: doc.fonte,
      titulo: doc.titulo,
      indice_trecho: indice,
      conteudo,
    })),
  );

  // O título entra no texto que vira embedding (mas não no conteúdo salvo):
  // um trecho solto como "35.1.2 Considera-se..." não diz de qual norma é.
  const vetores: number[][] = [];
  for (let i = 0; i < linhas.length; i += LOTE_EMBEDDING) {
    const lote = linhas.slice(i, i + LOTE_EMBEDDING);
    vetores.push(...(await embeddings(lote.map((l) => `${l.fonte}: ${l.titulo}\n\n${l.conteudo}`), MODELOS.embedding, rastro, "ingestao")));
  }
  if (vetores[0]?.length !== DIMENSAO_EMBEDDING) {
    throw new Error(
      `O modelo ${MODELOS.embedding} devolveu ${vetores[0]?.length} dimensões, mas a tabela espera ${DIMENSAO_EMBEDDING}.`,
    );
  }

  const supabase = obterSupabase();
  const limpeza = await supabase.rpc("reiniciar_documentos");
  if (limpeza.error) throw new Error(`Falha ao limpar a base: ${limpeza.error.message}`);

  for (let i = 0; i < linhas.length; i += LOTE_INSERCAO) {
    const lote = linhas.slice(i, i + LOTE_INSERCAO).map((l, j) => ({ ...l, embedding: vetores[i + j] }));
    const { error } = await supabase.from("documentos").insert(lote);
    if (error) throw new Error(`Falha ao gravar os trechos: ${error.message}. A migração 0002_colecoes.sql já foi rodada?`);
  }

  // A base mudou: o mapa dos embeddings e o cache de perguntas precisam ser refeitos.
  invalidarMapa();
  const porColecao = linhas.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.colecao]: (acc[l.colecao] ?? 0) + 1 }), {});
  return { documentos: documentos.length, trechos: linhas.length, porColecao };
}

export async function estadoDaBase(): Promise<EstadoBase> {
  const normas = await normasDisponiveis();
  const documentosNoCorpus = CORPUS.length + normas.length;
  if (!supabaseConfigurado()) {
    return { configurado: false, trechos: 0, documentos: 0, documentosNoCorpus, porColecao: {} };
  }
  const supabase = obterSupabase();
  const data = await lerEmPaginas<{ fonte: string; colecao: string }>(
    "Falha ao ler a base (as migrações SQL já foram rodadas?)",
    (inicio, fim) => supabase.from("documentos").select("fonte, colecao").order("id").range(inicio, fim),
  );
  const porColecao = data.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.colecao]: (acc[d.colecao] ?? 0) + 1 }), {});
  return {
    configurado: true,
    trechos: data.length,
    documentos: new Set(data.map((d) => d.fonte)).size,
    documentosNoCorpus,
    porColecao,
  };
}
