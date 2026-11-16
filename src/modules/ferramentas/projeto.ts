// Dados SIMULADOS do Projeto Linha 3, no formato que um sistema de
// planejamento (cronograma) e de controle de custos entregaria. Os números
// batem com os documentos do corpus (relatório de outubro, registro de riscos),
// para o agente cruzar dado estruturado com texto sem contradição.
//
// As contas (SPI, CPI, EAC, impacto de atraso) são feitas aqui, em código:
// o modelo pede o número, não calcula. Modelo de linguagem erra aritmética.

export const DATA_DE_CORTE = "2026-10-30";
export const BAC_MILHOES = 480;
export const CONTINGENCIA_MILHOES = 36;

export interface Atividade {
  id: string;
  nome: string;
  responsavel: string;
  inicioLinhaBase: string;
  fimLinhaBase: string;
  fimPrevisto: string;
  avancoPlanejado: number;
  avancoReal: number;
  /** Folga total em dias. 0 = caminho crítico: atrasou, a partida atrasa junto. */
  folgaDias: number;
  critica: boolean;
}

export const ATIVIDADES: Atividade[] = [
  { id: "A01", nome: "Terraplenagem geral", responsavel: "Construtora Pedra Lisa", inicioLinhaBase: "2025-01-06", fimLinhaBase: "2025-05-30", fimPrevisto: "2025-08-22", avancoPlanejado: 100, avancoReal: 100, folgaDias: 0, critica: false },
  { id: "A02", nome: "Fundações do forno", responsavel: "Construtora Pedra Lisa", inicioLinhaBase: "2025-06-02", fimLinhaBase: "2025-12-19", fimPrevisto: "2026-03-27", avancoPlanejado: 100, avancoReal: 100, folgaDias: 0, critica: true },
  { id: "A03", nome: "Montagem da estrutura metálica do forno", responsavel: "Eletromontagem Cerrado", inicioLinhaBase: "2026-01-05", fimLinhaBase: "2026-08-28", fimPrevisto: "2026-12-18", avancoPlanejado: 100, avancoReal: 72, folgaDias: 0, critica: true },
  { id: "A04", nome: "Instalação do refratário do forno", responsavel: "Eletromontagem Cerrado", inicioLinhaBase: "2026-09-01", fimLinhaBase: "2026-12-18", fimPrevisto: "2027-03-26", avancoPlanejado: 15, avancoReal: 0, folgaDias: 0, critica: true },
  { id: "A05", nome: "Montagem dos queimadores do forno", responsavel: "Eletromontagem Cerrado", inicioLinhaBase: "2026-12-01", fimLinhaBase: "2027-02-26", fimPrevisto: "2027-05-28", avancoPlanejado: 0, avancoReal: 0, folgaDias: 0, critica: true },
  { id: "A06", nome: "Comissionamento a quente do forno", responsavel: "Equipe de comissionamento", inicioLinhaBase: "2027-03-01", fimLinhaBase: "2027-06-11", fimPrevisto: "2027-09-10", avancoPlanejado: 0, avancoReal: 0, folgaDias: 0, critica: true },
  { id: "A07", nome: "Montagem e energização da subestação de 138 kV", responsavel: "Eletromontagem Cerrado", inicioLinhaBase: "2026-03-02", fimLinhaBase: "2026-10-23", fimPrevisto: "2027-01-22", avancoPlanejado: 100, avancoReal: 80, folgaDias: 20, critica: false },
  { id: "A08", nome: "Montagem da moagem e filtragem", responsavel: "Eletromontagem Cerrado", inicioLinhaBase: "2026-02-02", fimLinhaBase: "2027-01-29", fimPrevisto: "2027-03-12", avancoPlanejado: 70, avancoReal: 64, folgaDias: 45, critica: false },
  { id: "A09", nome: "Montagem dos discos de pelotamento", responsavel: "Eletromontagem Cerrado", inicioLinhaBase: "2026-04-06", fimLinhaBase: "2027-02-12", fimPrevisto: "2027-03-19", avancoPlanejado: 55, avancoReal: 50, folgaDias: 60, critica: false },
  { id: "A10", nome: "Transportadores de correia (3,2 km)", responsavel: "Eletromontagem Cerrado", inicioLinhaBase: "2026-03-02", fimLinhaBase: "2027-01-15", fimPrevisto: "2027-04-09", avancoPlanejado: 60, avancoReal: 48, folgaDias: 30, critica: false },
  { id: "A11", nome: "Pátio de estocagem e recuperação", responsavel: "Construtora Pedra Lisa", inicioLinhaBase: "2025-09-01", fimLinhaBase: "2026-11-27", fimPrevisto: "2026-12-11", avancoPlanejado: 90, avancoReal: 88, folgaDias: 90, critica: false },
  { id: "A12", nome: "Interligações com a planta existente", responsavel: "Eletromontagem Cerrado", inicioLinhaBase: "2026-08-03", fimLinhaBase: "2027-02-26", fimPrevisto: "2027-04-30", avancoPlanejado: 20, avancoReal: 10, folgaDias: 25, critica: false },
];

export const MARCOS = [
  { id: "M1", nome: "Terraplenagem concluída", linhaBase: "2025-05-30", previsto: "2025-08-22", concluido: true },
  { id: "M2", nome: "Fundações do forno concluídas", linhaBase: "2025-12-19", previsto: "2026-03-27", concluido: true },
  { id: "M3", nome: "Estrutura metálica do forno montada", linhaBase: "2026-08-28", previsto: "2026-12-18", concluido: false },
  { id: "M4", nome: "Subestação de 138 kV energizada", linhaBase: "2026-10-23", previsto: "2027-01-22", concluido: false },
  { id: "M5", nome: "Conclusão mecânica", linhaBase: "2027-03-26", previsto: "2027-06-25", concluido: false },
  { id: "M6", nome: "Partida da Linha 3", linhaBase: "2027-06-11", previsto: "2027-09-10", concluido: false },
];

/** Valor planejado, agregado e custo real acumulados, em milhões de reais, no fim de cada mês. */
export const VALOR_AGREGADO: Record<string, { pv: number; ev: number; ac: number }> = {
  "2026-05": { pv: 228.0, ev: 216.6, ac: 228.0 },
  "2026-06": { pv: 249.6, ev: 232.3, ac: 247.1 },
  "2026-07": { pv: 270.2, ev: 247.0, ac: 266.4 },
  "2026-08": { pv: 290.9, ev: 262.1, ac: 283.6 },
  "2026-09": { pv: 308.6, ev: 277.9, ac: 300.9 },
  "2026-10": { pv: 326.4, ev: 292.8, ac: 318.0 },
};

export const RISCOS = [
  { id: "R-01", titulo: "Atraso adicional do transformador de 138 kV", probabilidade: 4, impacto: 5, responsavel: "Gerente de suprimentos", resposta: "Expediting quinzenal e plano B de transformador alugado", status: "aberto" },
  { id: "R-02", titulo: "Escassez de soldadores qualificados", probabilidade: 4, impacto: 4, responsavel: "Gerente de construção", resposta: "Segundo subcontratado e escola de solda no canteiro", status: "aberto" },
  { id: "R-03", titulo: "Atraso na entrega do refratário do forno", probabilidade: 3, impacto: 5, responsavel: "Gerente de suprimentos", resposta: "Compra antecipada e estoque de segurança de 10%", status: "aberto" },
  { id: "R-04", titulo: "Variação cambial no pacote do forno", probabilidade: 3, impacto: 4, responsavel: "Gerente financeiro do projeto", resposta: "Hedge de 60% dos pagamentos restantes", status: "aberto" },
  { id: "R-05", titulo: "Interferência com a planta em operação", probabilidade: 3, impacto: 3, responsavel: "Gerente de construção", resposta: "Interligações nas paradas programadas", status: "aberto" },
  { id: "R-06", titulo: "Atraso na licença de operação", probabilidade: 2, impacto: 5, responsavel: "Gerente de meio ambiente", resposta: "Protocolo antecipado das condicionantes", status: "aberto" },
  { id: "R-07", titulo: "Acidente grave com paralisação da obra", probabilidade: 2, impacto: 5, responsavel: "Gerente de segurança", resposta: "Permissões de trabalho e auditorias semanais", status: "aberto" },
  { id: "R-08", titulo: "Chuvas acima da média no período 2026/2027", probabilidade: 3, impacto: 3, responsavel: "Gerente de construção", resposta: "Frentes cobertas e resequenciamento civil", status: "aberto" },
].map((r) => ({ ...r, severidade: r.probabilidade * r.impacto }));

const arred = (v: number, casas = 3) => Math.round(v * 10 ** casas) / 10 ** casas;

/** SPI, CPI e projeções, calculados em código a partir dos acumulados do mês. */
export function indicadoresDoMes(mes: string) {
  const v = VALOR_AGREGADO[mes];
  if (!v) throw new Error(`Não há dados de valor agregado para ${mes}. Meses disponíveis: ${Object.keys(VALOR_AGREGADO).join(", ")}.`);
  const spi = v.ev / v.pv;
  const cpi = v.ev / v.ac;
  const eac = BAC_MILHOES / cpi;
  const estado = (i: number) => (i < 0.9 ? "crítico" : i < 0.95 ? "alerta" : "normal");
  return {
    mes,
    unidade: "milhões de reais",
    bac: BAC_MILHOES,
    pv: v.pv,
    ev: v.ev,
    ac: v.ac,
    spi: arred(spi),
    cpi: arred(cpi),
    eac: arred(eac, 1),
    vac: arred(BAC_MILHOES - eac, 1),
    tcpi: arred((BAC_MILHOES - v.ev) / (BAC_MILHOES - v.ac)),
    estouro_vs_contingencia: arred(eac - BAC_MILHOES - CONTINGENCIA_MILHOES, 1),
    estado_prazo: estado(spi),
    estado_custo: estado(cpi),
    formulas: "SPI = EV/PV; CPI = EV/AC; EAC = BAC/CPI; VAC = BAC − EAC; TCPI = (BAC − EV)/(BAC − AC)",
  };
}

function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** E se esta atividade atrasar N dias? A folga absorve o que der; o resto vai para a partida. */
export function simularAtraso(atividadeId: string, dias: number) {
  const a = ATIVIDADES.find((x) => x.id === atividadeId);
  if (!a) throw new Error(`Atividade ${atividadeId} não existe.`);
  if (a.avancoReal >= 100) return { atividade: a.nome, observacao: "Atividade já concluída: atraso não se aplica." };
  const atrasoNaPartida = Math.max(0, dias - a.folgaDias);
  const partida = MARCOS.find((m) => m.id === "M6")!;
  return {
    atividade: `${a.id} ${a.nome}`,
    critica: a.critica,
    folga_dias: a.folgaDias,
    atraso_simulado_dias: dias,
    atraso_na_partida_dias: atrasoNaPartida,
    partida_prevista_hoje: partida.previsto,
    partida_com_atraso: somarDias(partida.previsto, atrasoNaPartida),
    leitura:
      atrasoNaPartida === 0
        ? `A folga de ${a.folgaDias} dias absorve o atraso; a partida não muda.`
        : `${a.critica ? "Atividade do caminho crítico" : `A folga de ${a.folgaDias} dias não basta`}: a partida atrasa ${atrasoNaPartida} dias.`,
  };
}

// Pedidos de mudança registrados pelo agente ficam em memória: é uma demonstração,
// nada sai daqui para um sistema real. Reiniciar o servidor zera a lista.
const pedidos: { numero: string; titulo: string; aprovador: string }[] = [];

export function registrarPedidoMudanca(titulo: string, justificativa: string, custoMilhoes: number, prazoDias: number) {
  const numero = `PM-${String(23 + pedidos.length).padStart(3, "0")}`;
  // Regra do registro de mudanças: acima de R$ 1 milhão ou com impacto em marco, decide o comitê.
  const aprovador = custoMilhoes > 1 || prazoDias > 0 ? "comitê executivo" : "gerente do projeto";
  pedidos.push({ numero, titulo, aprovador });
  return {
    numero,
    titulo,
    justificativa,
    impacto_custo_milhoes: custoMilhoes,
    impacto_prazo_dias: prazoDias,
    situacao: "registrado, aguardando análise",
    aprovador,
    observacao: "Pedido simulado para demonstração. Nenhum sistema externo foi acionado.",
  };
}
