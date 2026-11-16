"use client";

import { useState } from "react";
import {
  Aviso,
  Botao,
  Cabecalho,
  CampoPergunta,
  CustoDaRequisicao,
  Exemplos,
  Lampada,
  Painel,
  Secao,
  TextoResposta,
} from "@/components/ui";
import { Explicacao } from "@/components/explicacao";
import { chamarApi } from "@/lib/api";
import { fmtMs } from "@/lib/formato";
import { FERRAMENTAS } from "@/modules/ferramentas/definicoes";
import type { RespostaAgente } from "@/modules/ferramentas/tipos";

const EXEMPLOS = [
  "Como está o desempenho de prazo e custo do projeto em outubro e qual a tendência desde maio?",
  "Se a montagem dos transportadores de correia atrasar 45 dias, o que acontece com a partida?",
  "Quais atividades do caminho crítico estão atrasadas e quais riscos abertos ameaçam cada uma?",
  "Registre um pedido de mudança para alugar um transformador temporário de 138 kV, custo de R$ 2,4 milhões, sem impacto no caminho crítico.",
];

function Json({ valor }: { valor: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-lg bg-elevado px-4 py-3 text-sm leading-relaxed text-suave">
      {JSON.stringify(valor, null, 2)}
    </pre>
  );
}

export default function PaginaFerramentas() {
  const [pergunta, setPergunta] = useState(EXEMPLOS[0]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RespostaAgente | null>(null);

  async function executar() {
    setCarregando(true);
    setErro(null);
    try {
      setResultado(await chamarApi<RespostaAgente>("/api/ferramentas", { pergunta }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Function calling"
        termo="function-calling"
        descricao="O modelo não adivinha o andamento da obra: ele consulta o cronograma, o controle de custos e o registro de riscos, recebe o dado e só então responde. A tela mostra cada função chamada, com os argumentos que o modelo escolheu e o que voltou."
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Secao titulo="Pedido">
            <CampoPergunta rotulo="O que o assistente do projeto deve fazer?" valor={pergunta} aoMudar={setPergunta} />
            <Exemplos itens={EXEMPLOS} aoEscolher={setPergunta} />
            <Botao className="mt-6" onClick={executar} carregando={carregando} disabled={pergunta.trim().length < 3}>
              Executar agente
            </Botao>
          </Secao>

          {erro && (
            <div className="mb-10">
              <Aviso tipo="erro" titulo="O agente parou">
                {erro}
              </Aviso>
            </div>
          )}

          {resultado && (
            <>
              <Secao
                titulo="Chamadas de função"
                termo="agente"
                descricao={`${resultado.passos.length} chamadas em ${resultado.rodadas} rodadas. Chamadas da mesma rodada rodam em paralelo.`}
              >
                {resultado.passos.length === 0 ? (
                  <p className="text-suave">O modelo respondeu sem precisar de nenhuma função.</p>
                ) : (
                  <ol className="relative space-y-4 border-l border-linha-forte pl-6">
                    {resultado.passos.map((p, i) => (
                      <li key={i} className="relative">
                        <span className="absolute top-2 -left-[30px] rounded-full bg-white p-1">
                          <Lampada estado={p.ok ? "normal" : "alarme"} />
                        </span>
                        <Painel className="px-5 py-4">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p>
                              <span className="font-semibold">{p.ferramenta}</span>
                              <span className="ml-3 text-sm text-apagado">rodada {p.rodada}</span>
                            </p>
                            <span className="text-sm text-suave tabular-nums">{fmtMs(p.duracaoMs)}</span>
                          </div>
                          {Object.keys(p.argumentos).length > 0 && (
                            <p className="mt-2 text-sm break-words text-suave">
                              {Object.entries(p.argumentos)
                                .map(([k, v]) => `${k} = ${typeof v === "string" ? `"${v}"` : String(v)}`)
                                .join(", ")}
                            </p>
                          )}
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm text-apagado hover:text-suave">
                              {p.ok ? "Ver o que a função devolveu" : "Ver o erro devolvido ao modelo"}
                            </summary>
                            <div className="mt-2">
                              <Json valor={p.resultado} />
                            </div>
                          </details>
                        </Painel>
                      </li>
                    ))}
                  </ol>
                )}
              </Secao>

              <Secao titulo="Resposta do agente" termo="valor-agregado">
                <Painel className="mb-4 px-6 py-6">
                  <TextoResposta texto={resultado.resposta} />
                </Painel>
                <CustoDaRequisicao resumo={resultado.resumo} />
              </Secao>
            </>
          )}
        </div>

        <aside className="lg:sticky lg:top-12 lg:self-start">
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            Funções disponíveis
            <Explicacao termo="ferramentas" />
          </h2>
          <p className="mt-1 text-sm text-apagado">Exatamente o catálogo que o modelo recebe. Os dados do projeto são simulados.</p>
          <ul className="mt-4 divide-y divide-linha border-y border-linha">
            {FERRAMENTAS.map((f) =>
              f.type === "function" ? (
                <li key={f.function.name} className="py-3">
                  <p className="font-medium">{f.function.name}</p>
                  <p className="mt-0.5 text-sm leading-snug text-suave">{f.function.description}</p>
                </li>
              ) : null,
            )}
          </ul>
        </aside>
      </div>
    </>
  );
}
