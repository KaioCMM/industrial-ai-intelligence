import "server-only";
import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";
import type { ReasoningEffort } from "openai/resources/shared";
import { TETO_DIARIO_USD } from "./config";
import { ErroConfiguracao, ErroTetoGasto } from "./erros";
import { custoUsd, precoConhecido } from "./precos";
import { obterSupabase, supabaseConfigurado } from "./supabase";
import type { ChamadaLLM, Modulo, Rastro } from "./tipos";

// ÚNICO ponto do projeto que fala com a OpenAI.
// Nenhum módulo importa o SDK direto: contagem de tokens, custo, latência,
// teto de gasto, timeout e retry vivem aqui. É isso que permite o painel
// responder "quanto custou esta requisição?" sem cada módulo lembrar de medir.

let openai: OpenAI | null = null;

function clienteOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new ErroConfiguracao("OPENAI_API_KEY não definida. Coloque a chave no .env.local e reinicie o servidor.");
  }
  // 2 novas tentativas com backoff (padrão do SDK, só em erro 429/5xx/rede) e 45 s de limite por chamada.
  openai ??= new OpenAI({ timeout: 45_000, maxRetries: 2 });
  return openai;
}

export function novoRastro(modulo: Modulo): Rastro {
  return { traceId: crypto.randomUUID(), modulo, iniciadoEm: Date.now(), chamadas: [] };
}

// ---------- teto de gasto ----------

let gastoEmCache: { valor: number; lidoEm: number } | null = null;

export async function gastoDeHoje(): Promise<number> {
  if (!supabaseConfigurado()) return 0;
  if (gastoEmCache && Date.now() - gastoEmCache.lidoEm < 10_000) return gastoEmCache.valor;
  const { data, error } = await obterSupabase().rpc("gasto_do_dia");
  if (error) {
    console.warn(JSON.stringify({ evento: "teto.leitura_falhou", erro: error.message }));
    return gastoEmCache?.valor ?? 0;
  }
  gastoEmCache = { valor: Number(data ?? 0), lidoEm: Date.now() };
  return gastoEmCache.valor;
}

async function verificarTeto() {
  const gasto = await gastoDeHoje();
  if (gasto >= TETO_DIARIO_USD) {
    throw new ErroTetoGasto(
      `Teto diário de US$ ${TETO_DIARIO_USD.toFixed(2)} atingido (gasto hoje: US$ ${gasto.toFixed(4)}). Aumente TETO_DIARIO_USD no .env.local se quiser continuar.`,
    );
  }
}

// ---------- telemetria ----------

async function registrar(rastro: Rastro, chamada: ChamadaLLM) {
  rastro.chamadas.push(chamada);
  if (gastoEmCache) gastoEmCache.valor += chamada.custoUsd;

  // Log estruturado: uma linha JSON por chamada, com o trace_id que liga as chamadas de uma requisição.
  console.log(JSON.stringify({ evento: "llm.chamada", trace_id: rastro.traceId, ...chamada }));
  if (!precoConhecido(chamada.modelo)) {
    console.warn(JSON.stringify({ evento: "preco.desconhecido", modelo: chamada.modelo }));
  }

  if (!supabaseConfigurado()) return;
  const { error } = await obterSupabase().from("chamadas_llm").insert({
    trace_id: rastro.traceId,
    modulo: chamada.modulo,
    operacao: chamada.operacao,
    modelo: chamada.modelo,
    tokens_entrada: chamada.tokensEntrada,
    tokens_saida: chamada.tokensSaida,
    custo_usd: chamada.custoUsd,
    latencia_ms: Math.round(chamada.latenciaMs),
    status: chamada.status,
    erro: chamada.erro ?? null,
  });
  // Falha de telemetria não derruba a resposta ao usuário: só fica registrada no log.
  if (error) console.warn(JSON.stringify({ evento: "telemetria.falhou", erro: error.message }));
}

// Modelos de raciocínio (GPT-5, GPT-6, série o) recusam temperature e aceitam reasoning_effort;
// os outros (gpt-4.1, gpt-4o) é o contrário. O cliente manda só o que o modelo aceita,
// para trocar de modelo pelo .env sem mexer em nenhum módulo.
const ehModeloDeRaciocinio = (modelo: string) => /^(gpt-5|gpt-6|o\d)/.test(modelo);
// Modelos que não aceitam raciocínio "none": o mínimo deles é "low".
const semRaciocinioZero = (modelo: string) => /^gpt-6(\.\d+)?-(sol|astra)/.test(modelo);

function esforcoPara(modelo: string, pedido: ReasoningEffort | undefined): ReasoningEffort | undefined {
  if (!ehModeloDeRaciocinio(modelo) || !pedido) return undefined;
  return pedido === "none" && semRaciocinioZero(modelo) ? "low" : pedido;
}

// ---------- chamadas ----------

type ParametrosChat = Omit<ChatCompletionCreateParamsNonStreaming, "stream" | "temperature" | "reasoning_effort"> & {
  temperatura?: number;
  raciocinio?: ReasoningEffort;
};

export async function chat(params: ParametrosChat, rastro: Rastro, operacao: string): Promise<ChatCompletion> {
  const { temperatura, raciocinio, ...resto } = params;
  const cliente = clienteOpenAI();
  await verificarTeto();

  const esforco = esforcoPara(params.model, raciocinio);
  const inicio = performance.now();
  try {
    const resposta = await cliente.chat.completions.create({
      ...resto,
      ...(temperatura !== undefined && !ehModeloDeRaciocinio(params.model) ? { temperature: temperatura } : {}),
      ...(esforco ? { reasoning_effort: esforco } : {}),
      stream: false,
    });
    const tokensEntrada = resposta.usage?.prompt_tokens ?? 0;
    const tokensSaida = resposta.usage?.completion_tokens ?? 0;
    await registrar(rastro, {
      modulo: rastro.modulo,
      operacao,
      modelo: params.model,
      tokensEntrada,
      tokensSaida,
      custoUsd: custoUsd(params.model, tokensEntrada, tokensSaida),
      latenciaMs: performance.now() - inicio,
      status: "ok",
    });
    return resposta;
  } catch (e) {
    await registrar(rastro, {
      modulo: rastro.modulo,
      operacao,
      modelo: params.model,
      tokensEntrada: 0,
      tokensSaida: 0,
      custoUsd: 0,
      latenciaMs: performance.now() - inicio,
      status: "erro",
      erro: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

/**
 * Chat com saída estruturada (JSON Schema estrito). Usado por quem precisa de
 * um número ou rótulo, não de texto livre: roteador, reranker, juiz.
 */
export async function chatJson<T>(
  args: {
    modelo: string;
    sistema: string;
    usuario: string;
    nomeSchema: string;
    schema: Record<string, unknown>;
    temperatura?: number;
    raciocinio?: ReasoningEffort;
    maxTokens?: number;
  },
  rastro: Rastro,
  operacao: string,
): Promise<T> {
  const resposta = await chat(
    {
      model: args.modelo,
      messages: [
        { role: "system", content: args.sistema },
        { role: "user", content: args.usuario },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: args.nomeSchema, strict: true, schema: args.schema },
      },
      temperatura: args.temperatura,
      raciocinio: args.raciocinio,
      max_completion_tokens: args.maxTokens,
    },
    rastro,
    operacao,
  );
  const conteudo = resposta.choices[0]?.message.content;
  if (!conteudo) {
    // Em modelo de raciocínio, o limite de tokens conta o raciocínio: se ele consome tudo, a resposta sai vazia.
    const motivo = resposta.choices[0]?.finish_reason === "length" ? " O limite de tokens acabou antes da resposta; aumente maxTokens." : "";
    throw new Error(`${operacao}: o modelo não devolveu conteúdo.${motivo}`);
  }
  return JSON.parse(conteudo) as T;
}

export async function embeddings(
  textos: string[],
  modelo: string,
  rastro: Rastro,
  operacao: string,
): Promise<number[][]> {
  const cliente = clienteOpenAI();
  await verificarTeto();
  const inicio = performance.now();
  try {
    const resposta = await cliente.embeddings.create({ model: modelo, input: textos });
    const tokens = resposta.usage?.prompt_tokens ?? 0;
    await registrar(rastro, {
      modulo: rastro.modulo,
      operacao,
      modelo,
      tokensEntrada: tokens,
      tokensSaida: 0,
      custoUsd: custoUsd(modelo, tokens, 0),
      latenciaMs: performance.now() - inicio,
      status: "ok",
    });
    return resposta.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  } catch (e) {
    await registrar(rastro, {
      modulo: rastro.modulo,
      operacao,
      modelo,
      tokensEntrada: 0,
      tokensSaida: 0,
      custoUsd: 0,
      latenciaMs: performance.now() - inicio,
      status: "erro",
      erro: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}
