import "server-only";
import { obterSupabase, supabaseConfigurado } from "@/core/supabase";
import type { ResumoExecucao } from "./tipos";

interface LinhaJulgamento {
  execucao_id: string;
  criado_em: string;
  configuracao: string;
  nota: number;
  fidelidade: number;
  relevancia: number;
  completude: number;
  custo_usd: number;
  latencia_ms: number;
}

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Agrupa os julgamentos do conjunto de teste por execução, da mais recente para a mais antiga. */
export async function listarExecucoes(limite = 12): Promise<ResumoExecucao[]> {
  if (!supabaseConfigurado()) return [];
  const { data, error } = await obterSupabase()
    .from("julgamentos")
    .select("execucao_id, criado_em, configuracao, nota, fidelidade, relevancia, completude, custo_usd, latencia_ms")
    .eq("origem", "avaliacao")
    .order("criado_em", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`Falha ao ler as avaliações: ${error.message}`);

  const grupos = new Map<string, LinhaJulgamento[]>();
  for (const linha of data as LinhaJulgamento[]) {
    const lista = grupos.get(linha.execucao_id) ?? [];
    lista.push(linha);
    grupos.set(linha.execucao_id, lista);
  }

  return [...grupos.entries()].slice(0, limite).map(([execucaoId, linhas]) => ({
    execucaoId,
    criadoEm: linhas[linhas.length - 1].criado_em,
    configuracao: linhas[0].configuracao,
    casos: linhas.length,
    nota: media(linhas.map((l) => Number(l.nota))),
    fidelidade: media(linhas.map((l) => l.fidelidade)),
    relevancia: media(linhas.map((l) => l.relevancia)),
    completude: media(linhas.map((l) => l.completude)),
    custoUsd: linhas.reduce((s, l) => s + Number(l.custo_usd), 0),
    latenciaMediaMs: media(linhas.map((l) => l.latencia_ms)),
  }));
}
