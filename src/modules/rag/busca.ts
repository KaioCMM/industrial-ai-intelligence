import "server-only";
import { MODELOS } from "@/core/config";
import { embeddings } from "@/core/llm";
import { obterSupabase } from "@/core/supabase";
import type { Rastro } from "@/core/tipos";
import type { Colecao } from "./corpus";
import type { ModoBusca, Trecho } from "./tipos";

// As três buscas rodam no Postgres (funções em supabase/migrations). Aqui só
// se monta a consulta e se converte o resultado.

/**
 * Transforma a pergunta em "termo or termo or termo".
 * O padrão do websearch_to_tsquery é AND, que exige todas as palavras no mesmo
 * trecho e quase nunca encontra nada numa pergunta em linguagem natural.
 * As stopwords ("qual", "de", "o") o próprio dicionário português descarta.
 * Números de item ("35.1.2") e de norma ("NR-35") ficam inteiros: são o que
 * a busca lexical acerta e a vetorial erra.
 */
export function consultaLexical(pergunta: string): string {
  const termos = pergunta
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((t) => (t.length >= 3 || /\d/.test(t)) && t !== "or");
  return [...new Set(termos)].join(" or ");
}

interface LinhaBanco {
  id: number;
  colecao: string;
  fonte: string;
  titulo: string;
  conteudo: string;
  score: number;
  rank_lexical?: number | null;
  rank_vetorial?: number | null;
}

function paraTrecho(l: LinhaBanco): Trecho {
  return {
    id: l.id,
    colecao: l.colecao,
    fonte: l.fonte,
    titulo: l.titulo,
    conteudo: l.conteudo,
    score: Number(l.score),
    rankLexical: l.rank_lexical ?? null,
    rankVetorial: l.rank_vetorial ?? null,
  };
}

async function rpc(funcao: string, args: Record<string, unknown>): Promise<Trecho[]> {
  const { data, error } = await obterSupabase().rpc(funcao, args);
  if (error) throw new Error(`Falha na busca (${funcao}): ${error.message}`);
  return (data as LinhaBanco[]).map(paraTrecho);
}

// Cache do embedding da pergunta: o mesmo texto gera sempre o mesmo vetor, então
// repetir uma pergunta (comum numa demonstração, e na avaliação) não precisa pagar
// de novo os ~0,5 s e a chamada. Fica em memória, limitado às 300 perguntas mais recentes.
const CACHE_MAXIMO = 300;
const cacheEmbedding = new Map<string, number[]>();

export async function embeddingDaPergunta(pergunta: string, rastro: Rastro): Promise<number[]> {
  const chave = `${MODELOS.embedding}:${pergunta.trim().toLowerCase().replace(/\s+/g, " ")}`;
  const guardado = cacheEmbedding.get(chave);
  if (guardado) {
    // Reinsere para virar o mais recente (o Map mantém a ordem de inserção).
    cacheEmbedding.delete(chave);
    cacheEmbedding.set(chave, guardado);
    return guardado;
  }
  const [vetor] = await embeddings([pergunta], MODELOS.embedding, rastro, "embedding-consulta");
  cacheEmbedding.set(chave, vetor);
  if (cacheEmbedding.size > CACHE_MAXIMO) cacheEmbedding.delete(cacheEmbedding.keys().next().value!);
  return vetor;
}

export function buscarVetorial(vetor: number[], quantidade: number, colecao: Colecao | null = null) {
  return rpc("buscar_vetorial", { consulta_embedding: vetor, quantidade, filtro_colecao: colecao });
}

export function buscarLexical(pergunta: string, quantidade: number, colecao: Colecao | null = null) {
  const consulta = consultaLexical(pergunta);
  if (!consulta) return Promise.resolve([]);
  return rpc("buscar_lexical", { consulta, quantidade, filtro_colecao: colecao });
}

export function buscarHibrida(pergunta: string, vetor: number[], quantidade: number, colecao: Colecao | null = null) {
  return rpc("buscar_hibrida", {
    consulta_texto: consultaLexical(pergunta) || pergunta,
    consulta_embedding: vetor,
    quantidade,
    filtro_colecao: colecao,
  });
}

/** Roda os três modos com um único embedding, para comparar lado a lado. */
export async function buscarNosTresModos(pergunta: string, quantidade: number, rastro: Rastro, colecao: Colecao | null = null) {
  // A busca lexical não precisa do vetor: começa junto com o embedding, em vez de esperar por ele.
  const lexicalPronta = buscarLexical(pergunta, quantidade, colecao);
  const vetor = await embeddingDaPergunta(pergunta, rastro);
  const [vetorial, lexical, hibrida] = await Promise.all([
    buscarVetorial(vetor, quantidade, colecao),
    lexicalPronta,
    buscarHibrida(pergunta, vetor, quantidade, colecao),
  ]);
  return { vetorial, lexical, hibrida } satisfies Record<ModoBusca, Trecho[]>;
}

/** Busca num modo só: usada pelas ferramentas do agente e pela avaliação. */
export async function buscar(
  pergunta: string,
  modo: ModoBusca,
  quantidade: number,
  rastro: Rastro,
  colecao: Colecao | null = null,
) {
  if (modo === "lexical") return buscarLexical(pergunta, quantidade, colecao);
  const vetor = await embeddingDaPergunta(pergunta, rastro);
  return modo === "vetorial" ? buscarVetorial(vetor, quantidade, colecao) : buscarHibrida(pergunta, vetor, quantidade, colecao);
}
