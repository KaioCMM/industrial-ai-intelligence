-- Industrial AI Intelligence — esquema inicial.
-- Rode no SQL Editor do Supabase (ou com `supabase db push`). É idempotente.

create extension if not exists vector with schema extensions;

-- =====================================================================
-- Base de conhecimento (RAG)
-- =====================================================================
create table if not exists public.documentos (
  id            bigint generated always as identity primary key,
  fonte         text not null,
  titulo        text not null,
  indice_trecho int  not null,
  conteudo      text not null,
  -- 1536 = dimensão do text-embedding-3-small. Trocar de modelo exige trocar aqui.
  embedding     extensions.vector(1536) not null,
  -- Coluna gerada: o Postgres mantém o índice lexical sozinho, sem código de sincronização.
  fts           tsvector generated always as (
                  to_tsvector('portuguese'::regconfig, titulo || ' ' || conteudo)
                ) stored,
  criado_em     timestamptz not null default now()
);

-- HNSW em vez de IVFFlat: não precisa de dados para "treinar" o índice
-- e tem melhor recall com poucas linhas, que é o caso desta base.
create index if not exists documentos_embedding_idx
  on public.documentos using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists documentos_fts_idx
  on public.documentos using gin (fts);

-- Busca vetorial: similaridade de cosseno (1 - distância).
create or replace function public.buscar_vetorial(
  consulta_embedding extensions.vector(1536),
  quantidade int default 8
)
returns table (id bigint, fonte text, titulo text, conteudo text, score double precision)
language sql stable
set search_path = public, extensions
as $$
  select d.id, d.fonte, d.titulo, d.conteudo,
         1 - (d.embedding <=> consulta_embedding) as score
  from documentos d
  order by d.embedding <=> consulta_embedding
  limit quantidade;
$$;

-- Busca lexical: full-text do Postgres com dicionário português (radicais e stopwords).
-- A consulta chega já no formato "termo or termo" (montada em search.ts),
-- porque o padrão AND devolveria zero linhas para perguntas em linguagem natural.
create or replace function public.buscar_lexical(
  consulta text,
  quantidade int default 8
)
returns table (id bigint, fonte text, titulo text, conteudo text, score double precision)
language sql stable
set search_path = public, extensions
as $$
  select d.id, d.fonte, d.titulo, d.conteudo,
         ts_rank_cd(d.fts, q)::double precision as score
  from documentos d, websearch_to_tsquery('portuguese', consulta) q
  where d.fts @@ q
  order by score desc
  limit quantidade;
$$;

-- Busca híbrida com Reciprocal Rank Fusion (RRF).
-- RRF soma 1/(k + posição) de cada lista. Usa a POSIÇÃO, não o score, porque
-- os scores das duas buscas estão em escalas diferentes e não se somam direto.
-- k = 60 é o valor do artigo original (Cormack et al., 2009).
create or replace function public.buscar_hibrida(
  consulta_texto      text,
  consulta_embedding  extensions.vector(1536),
  quantidade          int default 8,
  peso_lexical        double precision default 1.0,
  peso_vetorial       double precision default 1.0,
  rrf_k               int default 60
)
returns table (
  id bigint, fonte text, titulo text, conteudo text,
  score double precision, rank_lexical bigint, rank_vetorial bigint
)
language sql stable
set search_path = public, extensions
as $$
  with lexical as (
    select d.id,
           row_number() over (
             order by ts_rank_cd(d.fts, websearch_to_tsquery('portuguese', consulta_texto)) desc
           ) as posicao
    from documentos d
    where d.fts @@ websearch_to_tsquery('portuguese', consulta_texto)
    order by posicao
    limit quantidade * 2
  ),
  vetorial as (
    select d.id,
           row_number() over (order by d.embedding <=> consulta_embedding) as posicao
    from documentos d
    order by posicao
    limit quantidade * 2
  )
  select d.id, d.fonte, d.titulo, d.conteudo,
         (coalesce(peso_lexical  / (rrf_k + l.posicao), 0.0) +
          coalesce(peso_vetorial / (rrf_k + v.posicao), 0.0))::double precision as score,
         l.posicao as rank_lexical,
         v.posicao as rank_vetorial
  from lexical l
  full outer join vetorial v on l.id = v.id
  join documentos d on d.id = coalesce(l.id, v.id)
  order by score desc
  limit quantidade;
$$;

-- Reindexação: apaga a base e zera a numeração antes de ingerir de novo.
-- security definer: "restart identity" exige ser dono da sequência de IDs, e o
-- dono é o postgres, não a service_role. Por rodar com privilégio do dono, a
-- execução fica liberada só para a service_role; anon e authenticated não apagam a base.
create or replace function public.reiniciar_documentos()
returns void
language sql
security definer
set search_path = public
as $$
  truncate table public.documentos restart identity;
$$;
revoke execute on function public.reiniciar_documentos() from public, anon, authenticated;
grant execute on function public.reiniciar_documentos() to service_role;

-- =====================================================================
-- Observabilidade
-- =====================================================================
create table if not exists public.chamadas_llm (
  id              bigint generated always as identity primary key,
  criado_em       timestamptz not null default now(),
  trace_id        uuid not null,
  modulo          text not null,
  operacao        text not null,
  modelo          text not null,
  tokens_entrada  int  not null default 0,
  tokens_saida    int  not null default 0,
  custo_usd       numeric(14, 8) not null default 0,
  latencia_ms     int  not null,
  status          text not null check (status in ('ok', 'erro')),
  erro            text
);
create index if not exists chamadas_llm_criado_em_idx on public.chamadas_llm (criado_em desc);
create index if not exists chamadas_llm_trace_idx on public.chamadas_llm (trace_id);

-- Notas do LLM-as-a-Judge. origem = 'avaliacao' (conjunto de teste) ou 'online' (resposta avaliada na hora).
create table if not exists public.julgamentos (
  id               bigint generated always as identity primary key,
  criado_em        timestamptz not null default now(),
  execucao_id      uuid,
  origem           text not null check (origem in ('avaliacao', 'online')),
  configuracao     text not null,
  caso_id          text,
  pergunta         text not null,
  resposta         text not null,
  referencia       text,
  fidelidade       smallint not null check (fidelidade between 1 and 5),
  relevancia       smallint not null check (relevancia between 1 and 5),
  completude       smallint not null check (completude between 1 and 5),
  nota             numeric(4, 2) not null,
  justificativa    text not null,
  modelo_juiz      text not null,
  custo_usd        numeric(14, 8) not null default 0,
  latencia_ms      int not null default 0
);
create index if not exists julgamentos_execucao_idx on public.julgamentos (execucao_id);
create index if not exists julgamentos_criado_em_idx on public.julgamentos (criado_em desc);

-- Gasto do dia no fuso de Brasília. O cliente da OpenAI consulta isto antes de cada chamada.
create or replace function public.gasto_do_dia()
returns numeric
language sql stable
set search_path = public
as $$
  select coalesce(sum(custo_usd), 0)
  from chamadas_llm
  where criado_em >= (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
$$;

-- RLS ligada e nenhuma política: a chave anônima não lê nem escreve nada.
-- O servidor usa a service_role, que ignora RLS. Não há login, então não há outro papel.
alter table public.documentos   enable row level security;
alter table public.chamadas_llm enable row level security;
alter table public.julgamentos  enable row level security;
