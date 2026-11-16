import type { ChatCompletionTool } from "openai/resources/chat/completions";

// As definições ficam separadas da execução porque o painel também as mostra:
// o catálogo na tela é exatamente o que o modelo recebe.
// strict: true faz a OpenAI garantir que os argumentos seguem o schema,
// então o código não precisa adivinhar formato de entrada.

const IDS_ATIVIDADES = ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A12"];
const MESES = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

const objeto = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export const FERRAMENTAS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "resumo_projeto",
      description: "Situação geral do Projeto Linha 3 na data de corte: marcos com data de linha de base e previsão atual, orçamento e reserva.",
      parameters: objeto({}),
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "listar_atividades",
      description:
        "Atividades do cronograma com avanço planejado e real, datas, folga e se estão no caminho crítico. Filtre por críticas, atrasadas ou todas.",
      parameters: objeto({ filtro: { type: "string", enum: ["criticas", "atrasadas", "todas"] } }),
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "indicadores_valor_agregado",
      description:
        "Calcula SPI, CPI, EAC, VAC e TCPI de um mês, com o estado (normal, alerta, crítico) pela política da gerenciadora. Sempre use esta função em vez de calcular.",
      parameters: objeto({ mes: { type: "string", enum: MESES, description: "Mês no formato AAAA-MM." } }),
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "simular_atraso",
      description:
        "Simula o atraso de uma atividade e calcula o impacto na data de partida, considerando a folga. Use para perguntas do tipo 'e se atrasar N dias?'.",
      parameters: objeto({
        atividade_id: { type: "string", enum: IDS_ATIVIDADES },
        dias: { type: "integer", description: "Dias de atraso a simular." },
      }),
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "listar_riscos",
      description: "Riscos abertos do projeto com probabilidade, impacto, severidade (1 a 25), responsável e resposta planejada.",
      parameters: objeto({ severidade_minima: { type: "integer", description: "Mostra só riscos com severidade igual ou maior. Use 1 para todos." } }),
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_documentacao",
      description:
        "Busca híbrida nos documentos. Coleções: projeto (relatórios, atas, riscos, comissionamento, lições aprendidas), normas (NRs oficiais) e conceitos (EVM, FEL).",
      parameters: objeto({
        consulta: { type: "string" },
        colecao: { type: "string", enum: ["projeto", "normas", "conceitos", "todas"] },
      }),
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "registrar_pedido_mudanca",
      description:
        "Registra um pedido de mudança no projeto. Só use quando o usuário pedir. Devolve o número e quem aprova, pela regra do projeto.",
      parameters: objeto({
        titulo: { type: "string" },
        justificativa: { type: "string" },
        impacto_custo_milhoes: { type: "number", description: "Impacto de custo em milhões de reais." },
        impacto_prazo_dias: { type: "integer", description: "Impacto no caminho crítico em dias (0 se nenhum)." },
      }),
      strict: true,
    },
  },
];
