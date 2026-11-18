import "server-only";
import { after } from "next/server";
import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";
import type { ReasoningEffort } from "openai/resources/shared";
import { tetoDiarioUsd } from "./config";
import { ErroConfiguracao, ErroTetoGasto } from "./erros";
import { custoUsd, precoConhecido } from "./precos";
import { aceitaTemperatura, esforcoPara } from "./regras-modelo";
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
let leituraEmAndamento: Promise<number> | null = null;

async function lerGastoDoBanco(): Promise<number> {
  const { data, error } = await obterSupabase().rpc("gasto_do_dia");
  if (error) {
    console.warn(JSON.stringify({ evento: "teto.leitura_falhou", erro: error.message }));
    // Com um valor recente guardado, segue com ele. Sem nenhum, o teto falha fechado:
    // antes valia 0, e o limite deixava tudo passar justamente quando não sabia o gasto.
    if (gastoEmCache) return gastoEmCache.valor;
    throw new ErroConfiguracao(
      `Não deu para ler o gasto do dia no Supabase (${error.message}). Sem esse número o teto não tem como ser garantido, então nenhuma chamada sai para a OpenAI.`,
    );
  }
  gastoEmCache = { valor: Number(data ?? 0), lidoEm: Date.now() };
  return gastoEmCache.valor;
}

/** Gasto do dia com no máximo 10 s de atraso. Leituras simultâneas compartilham a mesma consulta. */
export async function gastoDeHoje(): Promise<number> {
  if (!supabaseConfigurado()) return 0;
  if (gastoEmCache && Date.now() - gastoEmCache.lidoEm < 10_000) return gastoEmCache.valor;
  leituraEmAndamento ??= lerGastoDoBanco().finally(() => (leituraEmAndamento = null));
  return leituraEmAndamento;
}

async function verificarTeto() {
  // Com um valor já guardado, o teto usa ele na hora e atualiza em segundo plano se estiver
  // velho: a consulta (~150 ms) sai do caminho da resposta. Para um teto diário, alguns
  // segundos de defasagem não mudam nada; cada chamada também soma seu custo ao valor guardado.
  const teto = tetoDiarioUsd();
  let gasto: number;
  if (gastoEmCache) {
    gasto = gastoEmCache.valor;
    // Com valor guardado a leitura não lança (devolve o guardado); o catch só evita rejeição solta.
    if (Date.now() - gastoEmCache.lidoEm >= 10_000) void gastoDeHoje().catch(() => undefined);
  } else {
    gasto = await gastoDeHoje();
  }
  if (gasto >= teto) {
    throw new ErroTetoGasto(
      `Teto diário de US$ ${teto.toFixed(2)} atingido (gasto hoje: US$ ${gasto.toFixed(4)}). Aumente TETO_DIARIO_USD no .env.local se quiser continuar.`,
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
  const gravar = async () => {
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
  };
  // A gravação (~120 ms) roda depois que a resposta é enviada, com o after() do Next:
  // antes, cada chamada esperava a linha ser gravada para seguir. Fora de uma requisição
  // (um script, por exemplo) o after() não existe, e aí grava esperando, como antes.
  try {
    after(gravar);
  } catch {
    await gravar();
  }
}

// O cliente manda só os parâmetros que o modelo aceita (regras em regras-modelo.ts,
// verificadas com a API), para trocar de modelo pelo .env sem mexer em nenhum módulo.

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
      ...(temperatura !== undefined && aceitaTemperatura(params.model, esforco) ? { temperature: temperatura } : {}),
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
 * Chat em fluxo (streaming): repassa cada pedaço de texto assim que o modelo o escreve.
 * O tempo total não muda, mas a primeira palavra chega em menos de um segundo depois do
 * início da geração, em vez de o usuário esperar a resposta inteira.
 * O uso de tokens vem no último pedaço (include_usage), então custo e telemetria
 * continuam exatos, como nas chamadas sem fluxo.
 */
export async function chatEmFluxo(
  params: ParametrosChat,
  rastro: Rastro,
  operacao: string,
  aoReceber?: (pedaco: string) => void,
): Promise<{ texto: string; primeiroTokenMs: number | null }> {
  const { temperatura, raciocinio, ...resto } = params;
  const cliente = clienteOpenAI();
  await verificarTeto();

  const esforco = esforcoPara(params.model, raciocinio);
  const inicio = performance.now();
  let primeiroTokenMs: number | null = null;
  let texto = "";
  let tokensEntrada = 0;
  let tokensSaida = 0;
  try {
    const fluxo = await cliente.chat.completions.create({
      ...resto,
      ...(temperatura !== undefined && aceitaTemperatura(params.model, esforco) ? { temperature: temperatura } : {}),
      ...(esforco ? { reasoning_effort: esforco } : {}),
      stream: true,
      stream_options: { include_usage: true },
    });
    for await (const parte of fluxo) {
      const pedaco = parte.choices[0]?.delta?.content;
      if (pedaco) {
        primeiroTokenMs ??= performance.now() - inicio;
        texto += pedaco;
        aoReceber?.(pedaco);
      }
      if (parte.usage) {
        tokensEntrada = parte.usage.prompt_tokens;
        tokensSaida = parte.usage.completion_tokens;
      }
    }
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
    return { texto: texto.trim(), primeiroTokenMs };
  } catch (e) {
    await registrar(rastro, {
      modulo: rastro.modulo,
      operacao,
      modelo: params.model,
      tokensEntrada,
      tokensSaida,
      custoUsd: custoUsd(params.model, tokensEntrada, tokensSaida),
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
