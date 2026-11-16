import type { Termo } from "@/lib/glossario";

// As etapas do pipeline e quais operações da telemetria pertencem a cada uma.
// Fica num módulo compartilhado porque o servidor precisa dele para calcular os
// percentis por etapa, e a visão geral precisa dele para desenhar a linha de processo.

export interface EtapaPipeline {
  id: string;
  nome: string;
  tecnica: string;
  href: string;
  operacoes: string[];
  termo: Termo;
}

export const ETAPAS_PIPELINE: EtapaPipeline[] = [
  { id: "roteamento", nome: "Roteamento", tecnica: "Model routing", href: "/roteamento", operacoes: ["classificar-rota"], termo: "roteamento" },
  {
    id: "recuperacao",
    nome: "Recuperação",
    tecnica: "pgvector + full-text, fusão RRF",
    href: "/rag",
    // Só a busca da pergunta. A indexação ("ingestao") fica fora: roda uma vez, em lotes
    // de ~2 s, e não acontece quando alguém pergunta. Misturada aqui, inflava o p95.
    operacoes: ["embedding-consulta"],
    termo: "busca-hibrida",
  },
  { id: "reranking", nome: "Reranking", tecnica: "LLM lê pergunta e trecho juntos", href: "/rag", operacoes: ["rerank"], termo: "reranking" },
  {
    id: "geracao",
    nome: "Geração",
    tecnica: "Com function calling",
    href: "/ferramentas",
    operacoes: ["resposta-rag", "resposta-roteada", "agente-rodada"],
    termo: "function-calling",
  },
  { id: "juiz", nome: "Juiz", tecnica: "LLM-as-a-Judge com rubrica", href: "/avaliacao", operacoes: ["juiz"], termo: "llm-juiz" },
];
