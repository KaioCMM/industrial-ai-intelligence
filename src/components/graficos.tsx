// Gráficos feitos à mão em HTML/CSS: são três formatos simples (barra
// horizontal, coluna por hora, barra empilhada). Uma biblioteca de gráficos
// traria peso e um visual padrão que teria de ser desmontado para seguir o painel.

export function BarrasHorizontais({
  itens,
  formatar,
}: {
  itens: { rotulo: string; valor: number; detalhe?: string }[];
  formatar: (v: number) => string;
}) {
  const maximo = Math.max(...itens.map((i) => i.valor), 0);
  if (itens.length === 0) return <p className="text-apagado">Sem dados no período.</p>;
  return (
    <ul className="space-y-3">
      {itens.map((item, indice) => (
        <li key={item.rotulo}>
          <div className="mb-1 flex items-baseline justify-between gap-4">
            <span className="truncate">{item.rotulo}</span>
            <span className="shrink-0 tabular-nums">
              {formatar(item.valor)}
              {item.detalhe && <span className="ml-2 text-sm text-apagado">{item.detalhe}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-elevado">
            <div
              className={`h-full rounded-full ${indice === 0 ? "bg-sinal" : "bg-dado"}`}
              style={{ width: `${maximo > 0 ? Math.max((item.valor / maximo) * 100, 1) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ColunasPorHora({
  pontos,
  formatar,
  rotuloEixo,
}: {
  pontos: { hora: string; valor: number; dica: string }[];
  formatar: (v: number) => string;
  rotuloEixo: (iso: string) => string;
}) {
  const maximo = Math.max(...pontos.map((p) => p.valor), 0);
  return (
    <figure>
      <div className="flex items-baseline justify-between text-sm text-apagado">
        <span>máximo {formatar(maximo)}</span>
      </div>
      <div className="mt-2 flex h-36 items-end gap-[3px] border-b border-linha-forte">
        {pontos.map((p) => (
          <div key={p.hora} className="group relative flex h-full flex-1 items-end" title={p.dica}>
            <div
              className={`w-full rounded-t-md ${p.valor > 0 ? "bg-dado group-hover:bg-sinal" : "bg-linha/40"}`}
              style={{ height: `${maximo > 0 && p.valor > 0 ? Math.max((p.valor / maximo) * 100, 3) : 1.5}%` }}
            />
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-sm text-apagado tabular-nums">
        <span>{pontos[0] && rotuloEixo(pontos[0].hora)}</span>
        <span>{pontos[12] && rotuloEixo(pontos[12].hora)}</span>
        <span>agora</span>
      </figcaption>
    </figure>
  );
}

/** Para onde foi o tempo de uma requisição, etapa por etapa. */
export function TempoPorEtapa({ etapas }: { etapas: { nome: string; ms: number }[] }) {
  const visiveis = etapas.filter((e) => e.ms > 0);
  const total = visiveis.reduce((s, e) => s + e.ms, 0);
  const tons = ["bg-sinal", "bg-dado", "bg-suave/50", "bg-linha-forte"];
  if (total === 0) return null;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-lg">
        {visiveis.map((e, i) => (
          <div key={e.nome} className={tons[i % tons.length]} style={{ width: `${(e.ms / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {visiveis.map((e, i) => (
          <li key={e.nome} className="flex items-center gap-2">
            <span className={`inline-block size-2.5 rounded-full ${tons[i % tons.length]}`} aria-hidden="true" />
            <span className="text-suave">{e.nome}</span>
            <span className="tabular-nums">{e.ms < 1000 ? `${Math.round(e.ms)} ms` : `${(e.ms / 1000).toFixed(1).replace(".", ",")} s`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
