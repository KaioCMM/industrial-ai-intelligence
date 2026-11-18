import "server-only";
import { tetoDiarioUsd } from "@/core/config";
import { gastoDeHoje } from "@/core/llm";
import { obterSupabase, supabaseConfigurado } from "@/core/supabase";
import { listarExecucoes } from "@/modules/avaliacao/execucoes";
import { ETAPAS_PIPELINE } from "./etapas";
import type { Distribuicao, PainelObservabilidade } from "./tipos";

// A agregação é feita aqui, em TypeScript, sobre as linhas dos últimos 7 dias.
// Para o volume de uma demonstração (centenas de chamadas) é simples e rápido.
// Com volume de produção, isto viraria uma view materializada no Postgres.

const PERIODO_DIAS = 7;
// O Supabase devolve no máximo 1.000 linhas por consulta (max-rows do PostgREST).
// O painel avisa quando bate nesse limite, em vez de mostrar um total errado em silêncio.
const LIMITE_LINHAS = 1000;

interface Linha {
  criado_em: string;
  trace_id: string;
  modulo: string;
  operacao: string;
  modelo: string;
  tokens_entrada: number;
  tokens_saida: number;
  custo_usd: number;
  latencia_ms: number;
  status: string;
}

function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1);
  return ordenados[Math.max(0, indice)];
}

function distribuir(linhas: Linha[]): Distribuicao {
  const latencias = linhas.map((l) => l.latencia_ms);
  return {
    chamadas: linhas.length,
    custoUsd: linhas.reduce((s, l) => s + Number(l.custo_usd), 0),
    tokens: linhas.reduce((s, l) => s + l.tokens_entrada + l.tokens_saida, 0),
    p50: percentil(latencias, 50),
    p95: percentil(latencias, 95),
    erros: linhas.filter((l) => l.status === "erro").length,
  };
}

function agruparPor<K extends keyof Linha>(linhas: Linha[], chave: K) {
  const grupos = new Map<string, Linha[]>();
  for (const l of linhas) {
    const k = String(l[chave]);
    grupos.set(k, [...(grupos.get(k) ?? []), l]);
  }
  return [...grupos.entries()]
    .map(([k, ls]) => ({ chave: k, ...distribuir(ls) }))
    .sort((a, b) => b.custoUsd - a.custoUsd);
}

const vazio: Distribuicao = { chamadas: 0, custoUsd: 0, tokens: 0, p50: 0, p95: 0, erros: 0 };

export async function montarPainel(): Promise<PainelObservabilidade> {
  if (!supabaseConfigurado()) {
    return {
      configurado: false,
      periodoDias: PERIODO_DIAS,
      amostraLimitada: false,
      teto: { gastoHojeUsd: 0, tetoUsd: tetoDiarioUsd() },
      totais: { ...vazio, tokensEntrada: 0, tokensSaida: 0 },
      porModelo: [],
      porModulo: [],
      porOperacao: [],
      porEtapa: [],
      serie: [],
      qualidade: { julgamentos: 0, nota: null, fidelidade: null, relevancia: null, completude: null },
      execucoes: [],
      recentes: [],
    };
  }

  const supabase = obterSupabase();
  const desde = new Date(Date.now() - PERIODO_DIAS * 86_400_000).toISOString();

  const [chamadas, julgamentos, execucoes, gastoHojeUsd] = await Promise.all([
    supabase
      .from("chamadas_llm")
      .select("criado_em, trace_id, modulo, operacao, modelo, tokens_entrada, tokens_saida, custo_usd, latencia_ms, status")
      .gte("criado_em", desde)
      .order("criado_em", { ascending: false })
      .limit(LIMITE_LINHAS),
    supabase
      .from("julgamentos")
      .select("nota, fidelidade, relevancia, completude")
      .gte("criado_em", desde)
      .limit(LIMITE_LINHAS),
    listarExecucoes(6),
    gastoDeHoje(),
  ]);
  if (chamadas.error) throw new Error(`Falha ao ler a telemetria: ${chamadas.error.message}. A migração SQL já foi rodada?`);
  if (julgamentos.error) throw new Error(`Falha ao ler os julgamentos: ${julgamentos.error.message}`);

  const linhas = chamadas.data as Linha[];
  const notas = julgamentos.data as { nota: number; fidelidade: number; relevancia: number; completude: number }[];
  const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  // Série das últimas 24 horas, uma barra por hora, incluindo horas sem chamada.
  const horaAtual = new Date();
  horaAtual.setMinutes(0, 0, 0);
  const serie = Array.from({ length: 24 }, (_, i) => {
    const inicio = horaAtual.getTime() - (23 - i) * 3_600_000;
    const daHora = linhas.filter((l) => {
      const t = new Date(l.criado_em).getTime();
      return t >= inicio && t < inicio + 3_600_000;
    });
    return {
      hora: new Date(inicio).toISOString(),
      custoUsd: daHora.reduce((s, l) => s + Number(l.custo_usd), 0),
      chamadas: daHora.length,
    };
  });

  return {
    configurado: true,
    periodoDias: PERIODO_DIAS,
    amostraLimitada: linhas.length >= LIMITE_LINHAS,
    teto: { gastoHojeUsd, tetoUsd: tetoDiarioUsd() },
    totais: {
      ...distribuir(linhas),
      tokensEntrada: linhas.reduce((s, l) => s + l.tokens_entrada, 0),
      tokensSaida: linhas.reduce((s, l) => s + l.tokens_saida, 0),
    },
    porModelo: agruparPor(linhas, "modelo").map(({ chave, ...d }) => ({ modelo: chave, ...d })),
    porModulo: agruparPor(linhas, "modulo").map(({ chave, ...d }) => ({ modulo: chave, ...d })),
    porOperacao: agruparPor(linhas, "operacao").map(({ chave, ...d }) => ({ operacao: chave, ...d })),
    // Junta as linhas de todas as operações da etapa antes de calcular: o p95 da Geração
    // (três operações) não é o maior p95 entre elas, é o p95 de todas as latências juntas.
    porEtapa: ETAPAS_PIPELINE.map((e) => ({
      etapa: e.id,
      ...distribuir(linhas.filter((l) => e.operacoes.includes(l.operacao))),
    })),
    serie,
    qualidade: {
      julgamentos: notas.length,
      nota: media(notas.map((n) => Number(n.nota))),
      fidelidade: media(notas.map((n) => n.fidelidade)),
      relevancia: media(notas.map((n) => n.relevancia)),
      completude: media(notas.map((n) => n.completude)),
    },
    execucoes,
    recentes: linhas.slice(0, 30).map((l) => ({
      criadoEm: l.criado_em,
      traceId: l.trace_id,
      modulo: l.modulo,
      operacao: l.operacao,
      modelo: l.modelo,
      tokens: l.tokens_entrada + l.tokens_saida,
      custoUsd: Number(l.custo_usd),
      latenciaMs: l.latencia_ms,
      status: l.status,
    })),
  };
}
