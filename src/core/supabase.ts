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
