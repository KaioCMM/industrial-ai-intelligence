// Glossário do sistema: cada ícone "i" da interface abre um destes verbetes.
// Fica num arquivo só para a mesma explicação aparecer igual em todas as telas
// e para revisar o texto inteiro de uma vez antes de uma apresentação.
//
// Cada verbete responde três coisas: o que é, por que importa, e como este
// sistema faz (o "aqui"), porque é isso que se pergunta numa entrevista.

export interface Verbete {
  titulo: string;
  oQueE: string;
  aqui: string;
}

export const GLOSSARIO = {
  // ---------- visão geral ----------
  pipeline: {
    titulo: "Pipeline de IA",
    oQueE:
      "A sequência de etapas por onde uma pergunta passa até virar resposta. Separar em etapas permite medir e trocar cada uma sem mexer nas outras.",
    aqui: "Roteamento, recuperação, reranking, geração e juiz. Cada etapa registra quantas chamadas fez, quanto demorou e quanto custou.",
  },
  "cliente-unico": {
    titulo: "Ponto único de saída para o modelo",
    oQueE:
      "Toda chamada ao LLM passa por um só módulo. É ali que se controla custo, tempo limite, novas tentativas e telemetria, em vez de cada parte do sistema fazer isso do seu jeito.",
    aqui: "O arquivo src/core/llm.ts é o único que fala com a OpenAI. Por isso o painel sabe dizer quanto custou cada requisição.",
  },

  // ---------- RAG ----------
  rag: {
    titulo: "RAG (Retrieval-Augmented Generation)",
    oQueE:
      "Geração aumentada por recuperação: antes de responder, o sistema busca os trechos relevantes dos documentos e entrega só eles ao modelo. O modelo responde com base no que leu, não no que lembra do treino.",
    aqui: "Busca nos documentos do Projeto Linha 3 e nas NRs oficiais, reordena os candidatos e manda os 4 melhores para o modelo, que cita a fonte de cada afirmação.",
  },
  embedding: {
    titulo: "Embedding",
    oQueE:
      "Um texto transformado em uma lista de números que representa o seu significado. Textos com sentido parecido ficam com números parecidos, mesmo que usem palavras diferentes.",
    aqui: "Cada trecho vira um vetor de 1.536 números com o modelo text-embedding-3-small, ao custo de US$ 0,02 por milhão de tokens. A pergunta também vira vetor na hora da busca.",
  },
  trechos: {
    titulo: "Chunking (divisão em trechos)",
    oQueE:
      "Documentos são cortados em pedaços antes de virar embedding. O tamanho e o ponto de corte mudam a qualidade da busca: pedaço grande dilui o assunto, pedaço cortado no lugar errado perde o sentido.",
    aqui: "Documentos do projeto são cortados por parágrafo. As NRs são cortadas por item numerado (35.2.1…), para a resposta poder citar o item exato. Cada continuação leva o número do item.",
  },
  "banco-vetorial": {
    titulo: "Banco vetorial (pgvector + HNSW)",
    oQueE:
      "Um banco que guarda vetores e encontra os mais próximos de uma pergunta. O índice HNSW é um grafo que acha os vizinhos sem comparar com todos os vetores, um por um.",
    aqui: "Supabase com a extensão pgvector, dentro do próprio Postgres. Com milhares de trechos, não milhões, um banco dedicado seria mais uma peça sem ganho, e a telemetria fica no mesmo lugar.",
  },
  colecoes: {
    titulo: "Metadados e filtro por coleção",
    oQueE:
      "Além do texto e do vetor, cada trecho guarda informações como origem e tipo. Filtrar por elas restringe a busca ao que interessa antes de comparar significados.",
    aqui: "Cada trecho pertence a uma coleção: projeto, normas ou conceitos. O agente pode buscar só nas NRs, por exemplo.",
  },
  "busca-vetorial": {
    titulo: "Busca vetorial (semântica)",
    oQueE:
      "Compara o vetor da pergunta com o vetor de cada trecho pela distância de cosseno. Acha paráfrases e sinônimos, mas costuma errar códigos, siglas e números exatos.",
    aqui: "A função buscar_vetorial no Postgres ordena os trechos pela similaridade de cosseno com a pergunta.",
  },
  "busca-lexical": {
    titulo: "Busca lexical (por palavras)",
    oQueE:
      "Procura as palavras da pergunta no texto, como um buscador clássico (a família do BM25). Acerta códigos exatos, mas não entende que palavras diferentes podem querer dizer a mesma coisa.",
    aqui: "Full-text do Postgres com dicionário português, que reduz as palavras ao radical. Acha \"PM-022\" ou \"35.2.1\" na hora.",
  },
  "busca-hibrida": {
    titulo: "Busca híbrida",
    oQueE:
      "Roda a busca vetorial e a lexical e junta as duas listas. Cobre o ponto fraco de cada uma: a vetorial entende paráfrase, a lexical acerta código exato.",
    aqui: "As duas buscas e a fusão rodam numa única função SQL (buscar_hibrida), sem serviço extra.",
  },
  rrf: {
    titulo: "Reciprocal Rank Fusion (RRF)",
    oQueE:
      "Forma de juntar listas de resultados usando a posição de cada item, não o score. Cada item soma 1 dividido por (60 + posição) em cada lista. Usa a posição porque os scores das duas buscas estão em escalas diferentes e não podem ser somados.",
    aqui: "Ao lado de cada trecho da busca híbrida aparece a posição dele na lista lexical e na vetorial antes da fusão.",
  },
  reranking: {
    titulo: "Reranking",
    oQueE:
      "Uma segunda passada que reordena os candidatos da busca. A busca compara pergunta e trecho separadamente; o reranker lê os dois juntos e julga se o trecho responde de fato à pergunta.",
    aqui: "Um modelo leve (gpt-6-luna) dá nota de 0 a 10 aos 12 candidatos numa única chamada, lendo os primeiros 700 caracteres de cada um, e os 4 melhores viram o contexto. Custa menos de um décimo de centavo de dólar.",
  },
  "mapa-embeddings": {
    titulo: "Mapa dos embeddings (PCA)",
    oQueE:
      "Cada trecho é um vetor de 1.536 números. Para desenhar na tela, a PCA encontra as duas direções em que os vetores mais variam e projeta cada um nelas. Pontos próximos tendem a ter significado parecido, mas reduzir 1.536 dimensões a 2 perde informação: o mapa mostra grupos, não a distância exata.",
    aqui: "A projeção dos 843 trechos é calculada uma vez no servidor, sem biblioteca, e guardada. A pergunta é projetada nos mesmos dois eixos, em paralelo com o reranking, então não soma tempo à resposta.",
  },
  streaming: {
    titulo: "Streaming da resposta",
    oQueE:
      "O modelo escreve a resposta aos poucos, e cada pedaço é mostrado assim que chega. O tempo total quase não muda, mas a pessoa vê a primeira palavra em vez de uma tela parada: é o tempo percebido que cai.",
    aqui: "A rota responde em fluxo: as buscas aparecem assim que o contexto fica pronto, a resposta vem palavra a palavra e o juiz roda depois, fora do caminho da resposta.",
  },
  contexto: {
    titulo: "Contexto e citação",
    oQueE:
      "Os trechos entregues ao modelo junto com a pergunta. Pedir que cada afirmação cite o trecho de origem torna a resposta auditável: dá para conferir de onde saiu cada informação.",
    aqui: "O modelo recebe 4 trechos numerados e é instruído a citar [n] em cada afirmação e o item da NR. Se os trechos não cobrem a pergunta, deve dizer isso.",
  },
  alucinacao: {
    titulo: "Alucinação",
    oQueE:
      "Quando o modelo afirma algo que não está nas fontes, com a mesma confiança de quando acerta. RAG reduz o problema, mas não elimina: por isso se mede.",
    aqui: "O critério de fidelidade do juiz mede isso, e o conjunto de avaliação tem uma pergunta fora da base. A resposta certa nela é admitir que não sabe.",
  },
  "tempo-etapa": {
    titulo: "Latência por etapa",
    oQueE:
      "Quanto cada parte do pipeline demorou. Mostra onde otimizar: se o gargalo é a busca, o reranking ou a geração.",
    aqui: "A barra divide o tempo total entre busca, reranking, geração e juiz desta pergunta.",
  },

  // ---------- roteamento ----------
  roteamento: {
    titulo: "Model routing (roteamento de modelos)",
    oQueE:
      "Escolher, para cada pergunta, o modelo mais barato que dá conta dela. A maioria das perguntas é simples e não precisa do modelo mais caro.",
    aqui: "Um classificador barato rotula a pergunta como simples, moderada ou complexa. O modelo forte custa 20 vezes o leve, e o classificador custa uma fração de centavo.",
  },
  "saida-estruturada": {
    titulo: "Saída estruturada (JSON Schema)",
    oQueE:
      "Obriga o modelo a responder num formato definido, como um JSON com campos e valores permitidos. O código passa a receber dado confiável, em vez de texto livre que precisaria ser interpretado.",
    aqui: "O classificador, o reranker e o juiz respondem com schema estrito: complexidade só pode ser simples, moderada ou complexa; a nota, de 1 a 5.",
  },
  economia: {
    titulo: "Custo evitado",
    oQueE:
      "Quanto o roteamento economiza em relação a mandar tudo para o modelo mais caro. É o número que justifica a complexidade de ter um roteador.",
    aqui: "Compara o custo real (incluindo o classificador) com os mesmos tokens cobrados ao preço do modelo forte. É uma estimativa: outro modelo escreveria uma resposta de tamanho diferente.",
  },
  raciocinio: {
    titulo: "Esforço de raciocínio",
    oQueE:
      "Modelos de raciocínio \"pensam\" antes de responder, e esse pensamento gasta tokens cobrados como saída. Mais raciocínio ajuda em análise, mas deixa tarefas simples mais lentas e caras.",
    aqui: "Cada chamada define o próprio nível: classificar, reordenar e responder com o contexto pronto usam \"none\"; o juiz e as perguntas complexas usam \"low\".",
  },
  temperatura: {
    titulo: "Temperatura",
    oQueE:
      "Controla o quanto o modelo varia na escolha das palavras. Perto de 0, a mesma entrada tende a gerar a mesma saída; mais alta, a resposta varia mais. Em tarefa de rótulo ou nota se usa 0; em texto, um pouco acima.",
    aqui: "Testado com a API: nos GPT-6 a temperatura só vale com raciocínio \"none\". Com raciocínio, o modelo só aceita o padrão (1), e a consistência do juiz vem da rubrica e da saída estruturada.",
  },
  parametros: {
    titulo: "Parâmetros por chamada",
    oQueE:
      "Cada chamada ao modelo tem seus próprios ajustes: qual modelo, temperatura, raciocínio, limite de tokens e formato da saída. Ajustar por tarefa, e não um valor para tudo, é o que equilibra qualidade, custo e tempo.",
    aqui: "Os valores vêm de um registro único em src/core/config.ts, lido pelos módulos e por esta tabela: a tela nunca fica diferente do código.",
  },

  // ---------- function calling ----------
  "function-calling": {
    titulo: "Function calling",
    oQueE:
      "O modelo não executa nada: ele pede para chamar uma função, com argumentos, e o código executa e devolve o resultado. Assim o modelo consulta dados reais em vez de adivinhar.",
    aqui: "O modelo lê o cronograma, os índices de valor agregado e o registro de riscos por funções. As contas (SPI, CPI, impacto de atraso) são feitas em código, porque modelo de linguagem erra aritmética.",
  },
  agente: {
    titulo: "Agente (laço de ferramentas)",
    oQueE:
      "Um laço em que o modelo chama funções, lê os resultados e decide o próximo passo, até ter o que precisa para responder. Precisa de um limite, ou pode rodar para sempre e gastar sem controle.",
    aqui: "No máximo 6 rodadas; na última o modelo é obrigado a responder com o que tem. Chamadas da mesma rodada rodam em paralelo. Um erro numa função volta para o modelo, que pode corrigir o argumento.",
  },
  ferramentas: {
    titulo: "Catálogo de funções",
    oQueE:
      "A descrição de cada função (nome, para que serve e parâmetros) que o modelo recebe. A qualidade da descrição define se o modelo escolhe a função certa.",
    aqui: "As 7 funções usam schema estrito, então a OpenAI garante que os argumentos seguem o formato. A lista na tela é exatamente o que o modelo recebe.",
  },

  // ---------- avaliação ----------
  "llm-juiz": {
    titulo: "LLM-as-a-Judge",
    oQueE:
      "Usar um modelo para dar nota às respostas de outro, seguindo critérios definidos. Permite avaliar centenas de respostas sem revisão humana em cada uma, e comparar versões do sistema por número.",
    aqui: "O juiz é o gpt-6.1-sol, um modelo diferente e mais forte que o que responde: o mesmo modelo tenderia a favorecer o próprio estilo de resposta.",
  },
  rubrica: {
    titulo: "Rubrica",
    oQueE:
      "Critérios fixos com o que cada nota significa. Sem rubrica, \"dê uma nota de 1 a 5\" vira opinião do modelo e varia a cada execução.",
    aqui: "Três critérios com âncoras para as notas 1, 3 e 5. O juiz escreve a justificativa antes de dar a nota, para não inventar uma explicação para um número já escolhido.",
  },
  fidelidade: {
    titulo: "Fidelidade",
    oQueE: "Mede se cada afirmação da resposta está sustentada pelo contexto recuperado. É o critério que pega alucinação.",
    aqui: "Nota 5 quando tudo está nos trechos, ou quando a resposta admite que os trechos não cobrem a pergunta.",
  },
  relevancia: {
    titulo: "Relevância",
    oQueE: "Mede se a resposta trata do que foi perguntado, sem desviar de assunto.",
    aqui: "Nota 5 para resposta direta; 3 quando responde com desvios; 1 quando não responde.",
  },
  completude: {
    titulo: "Completude",
    oQueE:
      "Mede se a resposta cobre os pontos essenciais do gabarito. Nota baixa com fidelidade alta indica falha de recuperação: o modelo não inventou, mas a busca não trouxe o documento certo.",
    aqui: "O juiz compara a resposta com a referência escrita para cada caso do conjunto de avaliação.",
  },
  gabarito: {
    titulo: "Conjunto de avaliação",
    oQueE:
      "Perguntas com resposta de referência, fixas, usadas para medir o sistema sempre do mesmo jeito. É o que permite dizer, por número, se uma mudança melhorou ou piorou.",
    aqui: "Cada caso testa um tipo de falha: número exato, síntese de várias causas, cruzamento de documentos, regra de negócio, item de NR e uma pergunta fora da base.",
  },
  comparacao: {
    titulo: "Comparar configurações",
    oQueE:
      "Rodar o mesmo conjunto com configurações diferentes e comparar as médias. Substitui \"parece que melhorou\" por um número, e pega regressão antes de ir para produção.",
    aqui: "Cada linha do histórico é uma rodada. Dá para comparar, por exemplo, busca híbrida com e sem reranking.",
  },

  // ---------- observabilidade ----------
  observabilidade: {
    titulo: "Observabilidade de LLM",
    oQueE:
      "Registrar cada chamada ao modelo com tokens, custo, tempo e resultado. Sem isso não dá para responder quanto o sistema custa, onde está lento ou se a qualidade caiu.",
    aqui: "Cada chamada vira uma linha na tabela chamadas_llm do Supabase, e as notas do juiz ficam em julgamentos. Esta tela agrega as duas.",
  },
  tokens: {
    titulo: "Tokens de entrada e de saída",
    oQueE:
      "Tokens são os pedaços de texto que o modelo lê e escreve; em português, cerca de 4 caracteres cada. Entrada (o que se envia) e saída (o que o modelo escreve) têm preços diferentes, e a saída costuma custar de 5 a 10 vezes mais.",
    aqui: "No RAG, quase tudo é entrada, porque os trechos de contexto pesam. Nos modelos de raciocínio, o pensamento entra como saída.",
  },
  custo: {
    titulo: "Custo por chamada",
    oQueE: "Tokens de entrada vezes o preço de entrada, mais tokens de saída vezes o preço de saída. Muda com o modelo e com o tamanho do contexto.",
    aqui: "Calculado em src/core/precos.ts, com a tabela de preços oficial. Quando a OpenAI muda o preço, muda num arquivo só.",
  },
  percentis: {
    titulo: "Latência p50 e p95",
    oQueE:
      "p50 é a mediana: metade das chamadas termina antes desse tempo. p95 é o tempo que 95% das chamadas não passam. A média esconde as chamadas lentas; o p95 mostra o que o usuário sente nos piores casos.",
    aqui: "Calculados sobre as chamadas dos últimos 7 dias, no total e por módulo.",
  },
  teto: {
    titulo: "Teto de gasto (guardrail)",
    oQueE:
      "Um limite de custo que bloqueia novas chamadas quando é atingido. Protege contra laço infinito, bug ou uso indevido que geraria uma conta alta.",
    aqui: "Antes de cada chamada, o cliente soma o gasto do dia no Supabase. Acima do TETO_DIARIO_USD, a chamada é recusada antes de sair para a OpenAI.",
  },
  erros: {
    titulo: "Taxa de erro",
    oQueE:
      "Quantas chamadas falharam: modelo indisponível, tempo esgotado, limite de requisições. Falha também é registrada, com o motivo, para não sumir do painel.",
    aqui: "O cliente tenta de novo até 2 vezes em erros temporários e grava a falha com a mensagem da OpenAI. Foi assim que apareceu a aposentadoria do gpt-4.1-nano.",
  },
  trace: {
    titulo: "Trace (rastreamento)",
    oQueE:
      "Um identificador que liga todas as chamadas de uma mesma requisição. Permite reconstruir o que aconteceu numa pergunta: quais modelos foram chamados, em que ordem e quanto cada um custou.",
    aqui: "Cada requisição recebe um trace_id; passe o mouse sobre uma linha das chamadas recentes para vê-lo.",
  },

  // ---------- domínio: projetos de capital ----------
  "valor-agregado": {
    titulo: "Valor agregado (SPI e CPI)",
    oQueE:
      "Indicadores de gestão de projetos. SPI = valor agregado ÷ valor planejado (abaixo de 1, atrasado). CPI = valor agregado ÷ custo real (abaixo de 1, gastando mais que o previsto).",
    aqui: "Calculados em código pela função indicadores_valor_agregado, nunca pelo modelo. Abaixo de 0,95 é alerta; abaixo de 0,90, crítico.",
  },
} satisfies Record<string, Verbete>;

export type Termo = keyof typeof GLOSSARIO;
