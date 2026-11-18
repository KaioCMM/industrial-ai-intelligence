"use client";

import { useEffect, useState } from "react";
import type { LinhaParametros } from "@/app/api/parametros/route";
import { chamarApi } from "@/lib/api";
import { fmtDecimal, fmtInteiro } from "@/lib/formato";
import { Explicacao } from "./explicacao";
import { Painel } from "./ui";

/** Parâmetros efetivos de cada chamada ao modelo, lidos do mesmo registro que o código usa. */
export function TabelaParametros() {
  const [linhas, setLinhas] = useState<LinhaParametros[] | null>(null);

  useEffect(() => {
    chamarApi<{ linhas: LinhaParametros[] }>("/api/parametros")
      .then((r) => setLinhas(r.linhas))
      .catch(() => setLinhas([]));
  }, []);

  if (!linhas) return <p className="text-suave">Lendo os parâmetros…</p>;

  return (
    <Painel className="overflow-x-auto">
      <table className="w-full min-w-[940px] text-left text-sm">
        <thead className="text-apagado">
          <tr>
            <th className="px-5 py-3 font-medium">Etapa</th>
            <th className="px-5 py-3 font-medium">Modelo</th>
            <th className="px-5 py-3 font-medium">
              <span className="inline-flex items-center gap-1">
                Temperatura <Explicacao termo="temperatura" />
              </span>
            </th>
            <th className="px-5 py-3 font-medium">
              <span className="inline-flex items-center gap-1">
                Raciocínio <Explicacao termo="raciocinio" />
              </span>
            </th>
            <th className="px-5 py-3 text-right font-medium">Limite de tokens</th>
            <th className="px-5 py-3 font-medium">
              <span className="inline-flex items-center gap-1">
                Saída <Explicacao termo="saida-estruturada" />
              </span>
            </th>
            <th className="px-5 py-3 font-medium">Por quê</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.papel} className="border-t border-linha align-top">
              <td className="px-5 py-3 font-medium">{l.etapa}</td>
              <td className="px-5 py-3 whitespace-nowrap text-suave">{l.modelo}</td>
              <td className="px-5 py-3 whitespace-nowrap tabular-nums">
                {l.temperaturaAceita ? (
                  fmtDecimal(l.temperaturaConfigurada, 1)
                ) : (
                  // Mostra o que foi configurado riscado e o que de fato vai: o padrão do modelo.
                  <span>
                    <s className="text-apagado">{fmtDecimal(l.temperaturaConfigurada, 1)}</s> {fmtDecimal(l.temperaturaAplicada, 1)}
                    <span className="block text-xs text-apagado">padrão: modelo com raciocínio</span>
                  </span>
                )}
              </td>
              <td className="px-5 py-3 whitespace-nowrap">{l.raciocinio}</td>
              <td className="px-5 py-3 text-right tabular-nums">{fmtInteiro(l.maxTokens)}</td>
              <td className="px-5 py-3 whitespace-nowrap text-suave">{l.estruturada ? "JSON Schema" : "texto"}</td>
              <td className="max-w-[340px] px-5 py-3 leading-snug text-suave">{l.porque}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Painel>
  );
}
