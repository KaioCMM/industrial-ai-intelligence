# Industrial AI Intelligence

Assistente de IA para **gestão de projetos de capital**: lê o cronograma, o
controle de custos, o registro de riscos, os relatórios de obra e as Normas
Regulamentadoras para ajudar a antecipar **atraso e estouro de custo**, com o
custo, a latência e a qualidade de cada resposta visíveis na tela.

Next.js 16 · OpenAI · Supabase com pgvector · sem login (é para apresentação).

**Documentação completa:** [docs/sistema.md](docs/sistema.md): arquitetura, o
caminho de uma pergunta, cada módulo, métricas medidas, decisões, limitações,
roteiro de demonstração e perguntas prováveis numa entrevista.

## O cenário

Um projeto fictício, o **Projeto Linha 3**: expansão de uma planta de
pelotização da Mineração Serra Azul (empresa inventada), orçamento de
R$ 480 milhões, em execução e atrasado. Na data de corte (outubro de 2026) o
SPI é 0,897 e o CPI é 0,921, e a estimativa no término passa da reserva de
contingência. Documentos de obra reais são confidenciais; por isso o projeto
foi inventado, com números consistentes entre os documentos e os dados das
ferramentas.

As **Normas Regulamentadoras são reais**: o texto oficial vem do gov.br.

## Módulos

Cada técnica é um módulo independente: pasta própria em `src/modules`, rota de
API própria em `src/app/api` e página própria em `src/app/(painel)`.

| Módulo | Técnica | Código |
|---|---|---|
| Busca e RAG | Busca vetorial, lexical e híbrida (RRF) lado a lado, filtro por coleção, reranking com LLM, resposta com citação | `src/modules/rag` |
| Roteamento de modelos | Classificador barato escolhe entre modelo leve, médio e forte; mostra a economia | `src/modules/roteamento` |
| Function calling | Agente com 7 funções: cronograma, valor agregado (SPI/CPI/EAC), simulação de atraso, riscos, documentação, pedido de mudança | `src/modules/ferramentas` |
| Avaliação com juiz | LLM-as-a-Judge com rubrica de 3 critérios e gabarito; compara configurações | `src/modules/avaliacao` |
| Observabilidade | Tokens, custo, latência p50/p95, erros e qualidade por modelo e por módulo | `src/modules/observabilidade` |

O núcleo compartilhado fica em `src/core`. O arquivo **`src/core/llm.ts` é o
único que fala com a OpenAI**: ali vivem contagem de tokens, cálculo de custo,
teto de gasto diário, timeout, retry e gravação da telemetria.

## A base de conhecimento

Três coleções na mesma tabela, filtráveis na busca:

| Coleção | Conteúdo | Divisão em trechos |
|---|---|---|
| `projeto` | Termo de abertura, linha de base, relatório mensal, riscos, ata do comitê, diários de obra, pedidos de mudança, comissionamento, entrega, lições aprendidas, plano de segurança | Por parágrafo |
| `conceitos` | Valor agregado (EVM), FEL e classes de estimativa | Por parágrafo |
| `normas` | NR-01, 06, 10, 11, 12, 13, 18, 33 e 35, texto oficial | Por item numerado (35.1.2…), para a resposta citar o item |

## Como rodar

1. **Supabase.** No SQL Editor, rode em ordem `supabase/migrations/0001_inicial.sql`
   e `supabase/migrations/0002_colecoes.sql`.
2. **Variáveis.** Copie `.env.example` para `.env.local` e preencha
   `OPENAI_API_KEY`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
3. **Normas (opcional, recomendado).** Baixa os PDFs oficiais (cerca de 6,8 MB)
   e grava o texto em `dados/normas/`:
   ```bash
   node scripts/baixar-normas.mjs
   ```
4. **Servidor.**
   ```bash
   npm install
   npm run dev
   ```
5. Abra `http://localhost:3000`, clique em **Iniciar** e, em *Busca e RAG*,
   clique em **Indexar base**.

## Quanto custa (modelos padrão, preços em `src/core/precos.ts`)

| Ação | Custo |
|---|---|
| Indexar só o projeto | menos de US$ 0,001 |
| Indexar o projeto e as 9 NRs (843 trechos) | US$ 0,0052 |
| Uma pergunta no RAG com reranking | cerca de US$ 0,002 |
| A mesma pergunta com o juiz | cerca de US$ 0,005 |
| Uma pergunta roteada | de US$ 0,0002 (leve) a US$ 0,008 (forte) |
| Avaliação completa (11 casos, com juiz) | US$ 0,055 |

Indexação, pergunta no RAG e avaliação foram medidas em 16/11/2026 (detalhes na
seção 7 de [docs/sistema.md](docs/sistema.md)).

O `TETO_DIARIO_USD` (padrão US$ 2) bloqueia novas chamadas quando o gasto do
dia passa do limite. O teto falha fechado: um valor inválido (`2,5`, com vírgula,
por exemplo) ou um gasto do dia que não pôde ser lido no Supabase bloqueiam a
chamada, em vez de desligar o limite em silêncio.

## Decisões e o que foi descartado

- **Um cliente só para o modelo.** Se cada módulo chamasse a OpenAI direto,
  cada um teria de lembrar de medir custo; bastaria um esquecer para o painel mentir.
- **pgvector no Postgres, não um banco vetorial dedicado.** São milhares de
  trechos, não milhões. Assim a busca vetorial, a lexical e a fusão RRF rodam
  numa consulta SQL, e a telemetria fica no mesmo banco. A busca está isolada
  em `src/modules/rag/busca.ts`: trocar de banco não mexe no resto.
- **Busca híbrida com RRF.** RRF funde as listas pela posição, não pelo score,
  porque os scores vetorial e lexical estão em escalas diferentes. A lexical
  acha códigos exatos ("PM-022", "35.1.2"); a vetorial acha paráfrases.
- **Divisão de NR por item.** O item é o que as pessoas citam. Cortar por
  número fixo de caracteres partiria um item ao meio e a citação ficaria errada.
- **Contas em código, não no modelo.** SPI, CPI, EAC e o impacto de um atraso
  são calculados pelas ferramentas; o modelo só pede o número. Modelo de
  linguagem erra aritmética.
- **HNSW em vez de IVFFlat.** Não exige dados para treinar o índice e tem
  recall melhor com poucas linhas.
- **Reranking com LLM em vez de Cohere ou cross-encoder.** Evita mais um
  fornecedor e mais uma chave; uma chamada ao modelo leve avalia os 12 candidatos.
- **Roteamento por classificador em vez de palavras-chave.** Regra fixa erra em
  paráfrases e não explica a decisão; o classificador devolve o motivo.
- **Rubrica obrigatória no juiz.** Sem critérios fixos, a nota vira opinião e
  duas execuções não são comparáveis. A justificativa vem antes das notas. O
  juiz padrão (`gpt-6.1-sol`) raciocina e, por isso, não aceita temperatura: roda
  com o padrão do modelo, 1 (a tela de parâmetros mostra isso). A consistência vem
  da rubrica com âncoras e do schema estrito, não da temperatura.
- **Sem LangChain ou LlamaIndex.** Num sistema deste tamanho o framework
  esconderia justamente custo e latência, que são o assunto da demonstração.
- **Sem login.** O site é de apresentação. A chave `service_role` fica só no
  servidor e as tabelas têm RLS ligada sem políticas, então a chave anônima não
  lê nada.

## Próximos passos

- Rodada de avaliação sem reranking, para medir quanto de qualidade custaria economizar ~1,5 s.
- Reescrita da pergunta com sinônimos do domínio antes da busca.
- Fine-tuning (destilação) do classificador de roteamento, comparado por número.
- Agregação da telemetria em view materializada quando passar de 1.000 chamadas.
- Medir quanto a nota do juiz varia entre duas rodadas iguais (sem temperatura 0, ela não é garantida).
- Busca iterativa do pgvector (`hnsw.iterative_scan`) se o Postgres passar a usar o índice HNSW com filtro de coleção: o índice traz ~40 vizinhos e só depois filtra, e uma coleção pequena (o projeto é 2% da base) voltaria quase vazia. Hoje, com 843 trechos, a busca filtrada vem completa.
