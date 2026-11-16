-- Coleções de documentos: projeto (documentos do projeto de capital),
-- conceitos (EVM, FEL) e normas (NRs oficiais). As buscas ganham um filtro
-- opcional por coleção, para o agente procurar só nas normas, por exemplo.
-- Rode depois da 0001. É idempotente.

alter table public.documentos
  add column if not exists colecao text not null default 'projeto'
  check (colecao in ('projeto', 'conceitos', 'normas'));
create index if not exists documentos_colecao_idx on public.documentos (colecao);

-- A assinatura das funções muda (novo parâmetro), então as antigas saem antes:
-- com as duas versões no banco, a API do Supabase não saberia qual chamar.
drop function if exists public.buscar_vetorial(extensions.vector, int);
drop function if exists public.buscar_lexical(text, int);
drop function if exists public.buscar_hibrida(text, extensions.vector, int, double precision, double precision, int);

-- Com filtro, o HNSW acha os vizinhos mais próximos e só depois filtra.
-- Com poucos milhares de trechos isso não perde resultado; com milhões, valeria
-- ligar a busca iterativa do pgvector (hnsw.iterative_scan) ou um índice parcial por coleção.
create or replace function public.buscar_vetorial(
  consulta_embedding extensions.vector(1536),
  quantidade int default 8,
  filtro_colecao text default null
)
returns table (id bigint, colecao text, fonte text, titulo text, conteudo text, score double precision)
language sql stable
set search_path = public, extensions
as $$
  select d.id, d.colecao, d.fonte, d.titulo, d.conteudo,
         1 - (d.embedding <=> consulta_embedding) as score
  from documentos d
  where filtro_colecao is null or d.colecao = filtro_colecao
  order by d.embedding <=> consulta_embedding
  limit quantidade;
$$;

create or replace function public.buscar_lexical(
  consulta text,
  quantidade int default 8,
  filtro_colecao text default null
)
returns table (id bigint, colecao text, fonte text, titulo text, conteudo text, score double precision)
language sql stable
set search_path = public, extensions
as $$
  select d.id, d.colecao, d.fonte, d.titulo, d.conteudo,
         ts_rank_cd(d.fts, q)::double precision as score
  from documentos d, websearch_to_tsquery('portuguese', consulta) q
  where d.fts @@ q
    and (filtro_colecao is null or d.colecao = filtro_colecao)
  order by score desc
  limit quantidade;
$$;

create or replace function public.buscar_hibrida(
  consulta_texto      text,
  consulta_embedding  extensions.vector(1536),
  quantidade          int default 8,
  filtro_colecao      text default null,
  peso_lexical        double precision default 1.0,
  peso_vetorial       double precision default 1.0,
  rrf_k               int default 60
)
returns table (
  id bigint, colecao text, fonte text, titulo text, conteudo text,
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
      and (filtro_colecao is null or d.colecao = filtro_colecao)
    order by posicao
    limit quantidade * 2
  ),
  vetorial as (
    select d.id,
           row_number() over (order by d.embedding <=> consulta_embedding) as posicao
    from documentos d
    where filtro_colecao is null or d.colecao = filtro_colecao
    order by posicao
    limit quantidade * 2
  )
  select d.id, d.colecao, d.fonte, d.titulo, d.conteudo,
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
