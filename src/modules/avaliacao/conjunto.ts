import type { CasoAvaliacao } from "./tipos";

// Conjunto de teste com gabarito, escrito a partir do corpus do Projeto Linha 3.
// Cada caso testa um tipo de falha: número exato (SPI, EAC), síntese de várias
// causas, cruzamento de documentos (lição aprendida + plano), regra de negócio
// (quem aprova) e conceito. O caso "fora-da-base" mede alucinação: a resposta
// certa é admitir que não sabe. Os casos de NR só entram com as normas baixadas.

export const CONJUNTO_AVALIACAO: CasoAvaliacao[] = [
  {
    id: "evm-indices",
    pergunta: "Qual o SPI e o CPI do Projeto Linha 3 em outubro de 2026 e o que eles indicam?",
    referencia: "SPI de 0,897, em estado crítico (abaixo de 0,90): projeto atrasado. CPI de 0,921, em estado de alerta (abaixo de 0,95): gasto acima do previsto.",
  },
  {
    id: "evm-eac",
    pergunta: "Qual a estimativa de custo no término e o estouro cabe na reserva de contingência?",
    referencia: "EAC de R$ 521,3 milhões, estouro projetado de R$ 41,3 milhões; não cabe, porque a reserva de contingência é de R$ 36 milhões.",
  },
  {
    id: "causas-atraso",
    pergunta: "Quais são as causas do atraso do Projeto Linha 3?",
    referencia:
      "Chuvas atípicas em fevereiro e março de 2026 (38 dias parados), retrabalho nas fundações do forno por concreto abaixo da resistência, produtividade da montagem eletromecânica em 78% por falta de soldadores e atraso na entrega do transformador de 138 kV.",
  },
  {
    id: "marco-partida",
    pergunta: "Quando está prevista a partida da Linha 3 e qual era a data da linha de base?",
    referencia: "Previsão atual de setembro de 2027; na linha de base, a partida era em junho de 2027 (três meses de atraso).",
  },
  {
    id: "maior-risco",
    pergunta: "Qual é o risco de maior severidade do projeto e qual a resposta planejada?",
    referencia: "R-01, atraso adicional do transformador de 138 kV, severidade 20; resposta: expediting quinzenal na fábrica e plano B de transformador alugado.",
  },
  {
    id: "licao-comissionamento",
    pergunta: "Com quanta antecedência a equipe de comissionamento deve ser mobilizada e por quê?",
    referencia:
      "Pelo menos 6 meses antes da conclusão mecânica. Na Linha 2 a equipe chegou só 2 meses antes e a partida atrasou 4 meses.",
  },
  {
    id: "aprovacao-mudanca",
    pergunta: "Quem aprova um pedido de mudança de R$ 1,5 milhão?",
    referencia: "O comitê executivo, porque pedidos acima de R$ 1 milhão (ou com impacto em marco contratual) exigem a aprovação dele.",
  },
  {
    id: "handover-categoria-a",
    pergunta: "O que é uma pendência de categoria A na entrega de um sistema?",
    referencia: "Pendência que impede o comissionamento ou a operação segura; precisa estar resolvida antes da transferência do sistema.",
  },
  {
    id: "fel-classe",
    pergunta: "Que classe de estimativa de custo a FEL 3 produz e qual a faixa de precisão dela?",
    referencia: "Classe 3, com faixa típica de −10% a −20% até +10% a +30%.",
  },
  {
    id: "nr35-altura",
    pergunta: "A partir de que altura a NR-35 se aplica?",
    // Conferido no texto oficial vigente (atualização de julho de 2026): o item é o 35.2.1.
    referencia: "Item 35.2.1: a toda atividade com diferença de nível acima de 2,0 m do nível inferior, onde haja risco de queda.",
    exigeNormas: true,
  },
  {
    id: "fora-da-base",
    pergunta: "Qual será a cotação do minério de ferro no próximo trimestre?",
    referencia: "A documentação não cobre cotações de mercado; a resposta correta é dizer que a informação não está disponível.",
  },
];
