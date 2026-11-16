import "server-only";
import { MODELOS, RACIOCINIO } from "@/core/config";
import { chat, chatJson } from "@/core/llm";
import { custoUsd } from "@/core/precos";
import type { Rastro } from "@/core/tipos";
import type { Complexidade, DecisaoRota } from "./tipos";

// Model Routing: um classificador barato decide qual modelo responde.
//
// A maior parte das perguntas do dia a dia de um projeto é simples (consulta,
// definição, sigla) e não precisa do modelo mais caro, que custa 20 vezes mais que o
// leve. O classificador custa uma fração de centavo e se paga quando desvia uma
// pergunta do modelo forte.
// Descartado: regra fixa por palavras-chave. É mais barata, mas erra em
// paráfrases ("faça um plano" vs. "qual o plano") e não explica a decisão.
// O classificador devolve o motivo, que vai para o painel: dá para auditar.

export const MAPA_ROTAS: Record<Complexidade, string> = {
  simples: MODELOS.leve,
  moderada: MODELOS.medio,
  complexa: MODELOS.forte,
};

export async function classificar(pergunta: string, rastro: Rastro): Promise<DecisaoRota> {
  return chatJson<DecisaoRota>(
    {
      modelo: MODELOS.leve,
      sistema:
        "Classifique a complexidade de uma pergunta sobre gestão de projetos de capital, engenharia ou obra industrial, para escolher o modelo que vai respondê-la.\n" +
        "simples: fato direto, definição curta, sigla, conta de uma etapa, resposta de uma ou duas frases.\n" +
        "moderada: explicação, comparação entre dois conceitos, procedimento conhecido em passos.\n" +
        "complexa: plano de recuperação, análise de impacto com trade-offs, diagnóstico com várias hipóteses, cálculo em várias etapas.\n" +
        "Responda com a complexidade e um motivo de no máximo uma frase.",
      usuario: pergunta,
      nomeSchema: "rota",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["complexidade", "motivo"],
        properties: {
          complexidade: { type: "string", enum: ["simples", "moderada", "complexa"] },
          motivo: { type: "string" },
        },
      },
      temperatura: 0,
      raciocinio: RACIOCINIO.rapido,
      maxTokens: 200,
    },
    rastro,
    "classificar-rota",
  );
}

export async function rotearEResponder(pergunta: string, rastro: Rastro) {
  const decisao = await classificar(pergunta, rastro);
  const modelo = MAPA_ROTAS[decisao.complexidade];

  const resposta = await chat(
    {
      model: modelo,
      messages: [
        {
          role: "system",
          content:
            "Você é um gerente de projetos de capital experiente, com vivência em obras industriais e de infraestrutura. Responda em português, de forma objetiva e prática. Use listas só quando ajudarem.",
        },
        { role: "user", content: pergunta },
      ],
      temperatura: 0.3,
      // Só a pergunta complexa ganha raciocínio, e o limite de tokens cresce para caber ele.
      raciocinio: decisao.complexidade === "complexa" ? RACIOCINIO.analise : RACIOCINIO.rapido,
      max_completion_tokens: decisao.complexidade === "complexa" ? 4000 : 1200,
    },
    rastro,
    "resposta-roteada",
  );

  const custoRealUsd = rastro.chamadas.reduce((s, c) => s + c.custoUsd, 0);
  const tokensEntrada = resposta.usage?.prompt_tokens ?? 0;
  const tokensSaida = resposta.usage?.completion_tokens ?? 0;

  return {
    decisao,
    modelo,
    mapa: MAPA_ROTAS,
    resposta: resposta.choices[0]?.message.content?.trim() ?? "",
    custoRealUsd,
    custoSemRoteamentoUsd: custoUsd(MODELOS.forte, tokensEntrada, tokensSaida),
  };
}
