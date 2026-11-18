import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ErroConfiguracao } from "./erros";

// A chave service_role só existe no servidor. O site não tem login, então o
// navegador nunca fala com o Supabase direto: tudo passa pelas rotas da API.
// As tabelas têm RLS ligada e nenhuma política, o que bloqueia a chave anônima.

let cliente: SupabaseClient | null = null;

export function supabaseConfigurado(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function obterSupabase(): SupabaseClient {
  if (!supabaseConfigurado()) {
    throw new ErroConfiguracao(
      "Supabase não configurado. Preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local e reinicie o servidor.",
    );
  }
  cliente ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  return cliente;
}

/** Máximo de linhas por consulta no PostgREST do Supabase (max-rows). O resto é cortado sem erro. */
const LINHAS_POR_PAGINA = 1000;

/**
 * Lê todas as linhas de uma consulta, em páginas. Sem paginar, ler a tabela inteira para
 * em 1.000 linhas em silêncio: a contagem da base travaria em 1.000 quando passasse disso.
 * A consulta precisa ter ordem fixa (.order("id")), senão uma linha pode cair em duas
 * páginas ou em nenhuma.
 */
export async function lerEmPaginas<T>(
  descricaoDoErro: string,
  pagina: (inicio: number, fim: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const linhas: T[] = [];
  for (let inicio = 0; ; inicio += LINHAS_POR_PAGINA) {
    const { data, error } = await pagina(inicio, inicio + LINHAS_POR_PAGINA - 1);
    if (error) throw new Error(`${descricaoDoErro}: ${error.message}`);
    linhas.push(...(data ?? []));
    if ((data?.length ?? 0) < LINHAS_POR_PAGINA) return linhas;
  }
}
