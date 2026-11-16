import "server-only";
import OpenAI from "openai";

/** Falta variável de ambiente ou serviço: problema de instalação, não de uso. */
export class ErroConfiguracao extends Error {}

/** O teto diário de gasto foi atingido. */
export class ErroTetoGasto extends Error {}

/** Entrada inválida vinda do navegador. */
export class ErroEntrada extends Error {}

// Toda rota da API termina aqui quando algo dá errado, para o painel
// sempre receber { erro } com uma frase que diz o que fazer.
export function respostaDeErro(e: unknown): Response {
  if (e instanceof ErroEntrada) return Response.json({ erro: e.message }, { status: 400 });
  if (e instanceof ErroConfiguracao) return Response.json({ erro: e.message, tipo: "configuracao" }, { status: 503 });
  if (e instanceof ErroTetoGasto) return Response.json({ erro: e.message, tipo: "teto" }, { status: 429 });
  if (e instanceof OpenAI.APIError) {
    const status = e.status ?? 502;
    const dica = status === 401 ? " Confira a OPENAI_API_KEY no .env.local." : "";
    return Response.json({ erro: `A OpenAI recusou a chamada (${status}): ${e.message}.${dica}` }, { status: 502 });
  }
  console.error(e);
  const mensagem = e instanceof Error ? e.message : "Erro desconhecido";
  return Response.json({ erro: mensagem }, { status: 500 });
}

/** Valida a pergunta na fronteira: texto, sem espaços sobrando, de 3 a 2.000 caracteres. */
export function lerPergunta(valor: unknown): string {
  if (typeof valor !== "string") throw new ErroEntrada("Envie a pergunta como texto.");
  const pergunta = valor.trim();
  if (pergunta.length < 3) throw new ErroEntrada("A pergunta precisa de pelo menos 3 caracteres.");
  if (pergunta.length > 2000) throw new ErroEntrada("A pergunta passou de 2.000 caracteres. Resuma e envie de novo.");
  return pergunta;
}

export async function lerCorpo(req: Request): Promise<Record<string, unknown>> {
  try {
    const corpo = await req.json();
    if (corpo && typeof corpo === "object") return corpo as Record<string, unknown>;
  } catch {
    // cai no erro abaixo
  }
  throw new ErroEntrada("O corpo da requisição precisa ser um JSON.");
}
