import type { ReactNode } from "react";
import type { ResumoRastro } from "@/core/tipos";
import { fmtInteiro, fmtMs, fmtUsd } from "@/lib/formato";
import type { Termo } from "@/lib/glossario";
import { Explicacao } from "./explicacao";

// Componentes de base no visual do Loc Polaris: cartões brancos sólidos com raio
// de 16 px e sombra quase nula tingida de azul; botões em cápsula; seletor e
// chave no formato do iOS. O vidro fica reservado para o trilho, que flutua.

export function Cabecalho({
  titulo,
  descricao,
  termo,
  children,
}: {
  titulo: string;
  descricao: ReactNode;
  termo?: Termo;
  children?: ReactNode;
}) {
  return (
    <header className="mb-10">
      <h1 className="flex items-center gap-3 text-[2.25rem] leading-[1.1] font-semibold tracking-tight sm:text-[2.6rem]">
        {titulo}
        {termo && <Explicacao termo={termo} className="size-6 [&_svg]:size-6" />}
      </h1>
      <p className="mt-3 max-w-[66ch] text-[17px] leading-relaxed text-suave">{descricao}</p>
      {children}
    </header>
  );
}

export function Secao({
  titulo,
  descricao,
  termo,
  acao,
  children,
  className = "",
}: {
  titulo: string;
  descricao?: ReactNode;
  termo?: Termo;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-12 ${className}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            {titulo}
            {termo && <Explicacao termo={termo} />}
          </h2>
          {descricao && <p className="mt-1 max-w-[70ch] text-[15px] text-suave">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Painel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-linha bg-painel shadow-[0_1px_2px_rgb(14_21_37/0.04),0_4px_16px_-8px_rgb(14_21_37/0.06)] ${className}`}>
      {children}
    </div>
  );
}

export function Botao({
  children,
  variante = "primario",
  carregando = false,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primario" | "secundario"; carregando?: boolean }) {
  const estilo =
    variante === "primario"
      ? "bg-sinal text-white font-semibold hover:bg-[#1e40af]"
      : "border border-white/90 bg-white/70 text-texto shadow-[0_0_0_1px_var(--vidro-contorno),inset_0_1px_0_white] hover:bg-white";
  return (
    <button
      {...props}
      disabled={props.disabled || carregando}
      aria-busy={carregando || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 transition-[background-color,transform] active:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50 ${estilo} ${className}`}
    >
      {carregando && (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
      )}
      {children}
    </button>
  );
}

export function CampoPergunta({
  valor,
  aoMudar,
  rotulo,
  linhas = 3,
  placeholder,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  rotulo: string;
  linhas?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-medium">{rotulo}</span>
      <textarea
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        rows={linhas}
        placeholder={placeholder}
        className="w-full resize-y rounded-2xl border border-linha-forte bg-painel px-4 py-3 text-[17px] leading-relaxed shadow-[0_1px_2px_rgb(14_21_37/0.04)] placeholder:text-apagado focus:border-sinal focus:ring-2 focus:ring-sinal/25 focus:outline-none"
      />
    </label>
  );
}

export function Exemplos({ itens, aoEscolher }: { itens: string[]; aoEscolher: (v: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {itens.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => aoEscolher(item)}
          className="rounded-full border border-linha bg-white/70 px-3.5 py-1.5 text-left text-sm text-suave transition-colors hover:border-linha-forte hover:bg-white hover:text-texto"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

/** Seletor segmentado no formato do iOS: trilho cinza e a opção ativa em branco, elevada. */
export function Alternador<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  termo,
}: {
  rotulo: string;
  termo?: Termo;
  opcoes: { valor: T; nome: string }[];
  valor: T;
  aoMudar: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-1.5 text-sm text-suave">
        {rotulo}
        {termo && <Explicacao termo={termo} />}
      </legend>
      <div role="radiogroup" className="inline-flex rounded-full bg-[#e6e8ec] p-[3px]">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={valor === o.valor}
            onClick={() => aoMudar(o.valor)}
            className={`min-h-9 rounded-full px-4 text-sm transition-[background-color,box-shadow] ${
              valor === o.valor
                ? "bg-white font-semibold text-texto shadow-[0_3px_8px_rgb(0_0_0/0.12),0_1px_1px_rgb(0_0_0/0.04)]"
                : "text-suave hover:text-texto"
            }`}
          >
            {o.nome}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Chave no formato do iOS. */
export function Interruptor({
  rotulo,
  detalhe,
  ligado,
  aoMudar,
  termo,
}: {
  rotulo: string;
  termo?: Termo;
  detalhe?: string;
  ligado: boolean;
  aoMudar: (v: boolean) => void;
}) {
  // O ícone fica fora do <label>: clicar nele abre a explicação, não liga a chave.
  return (
    <div className="flex items-start gap-1.5">
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={ligado} onChange={(e) => aoMudar(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`relative mt-0.5 inline-block h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sinal ${
          ligado ? "bg-sinal" : "bg-[#e3e5e9]"
        }`}
      >
        <span
          className={`absolute top-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.06)] transition-[left] duration-200 ${
            ligado ? "left-[22px]" : "left-[2px]"
          }`}
        />
      </span>
      <span>
        <span className="block text-[15px]">{rotulo}</span>
        {detalhe && <span className="block text-sm text-apagado">{detalhe}</span>}
      </span>
    </label>
    {termo && <Explicacao termo={termo} className="mt-[3px]" />}
    </div>
  );
}

/** Indicador de estado: cobalto = ativo, verde = normal, vermelho = alarme. */
export function Lampada({ estado }: { estado: "ativo" | "normal" | "alarme" | "apagado" }) {
  const cor = {
    ativo: "bg-sinal shadow-[0_0_0_3px_rgb(29_78_216/0.18)]",
    normal: "bg-normal",
    alarme: "bg-alarme shadow-[0_0_0_3px_rgb(180_35_24/0.15)]",
    apagado: "bg-linha-forte",
  }[estado];
  return <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${cor}`} />;
}

export function Aviso({ tipo = "info", titulo, children }: { tipo?: "info" | "erro"; titulo?: string; children: ReactNode }) {
  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className={`rounded-2xl border px-5 py-4 ${tipo === "erro" ? "border-alarme/25 bg-[#fdf1f0]" : "border-linha bg-white/80"}`}
    >
      {titulo && <p className={`mb-1 font-semibold ${tipo === "erro" ? "text-alarme" : ""}`}>{titulo}</p>}
      <div className="leading-relaxed text-suave [&_code]:rounded [&_code]:bg-elevado [&_code]:px-1 [&_code]:text-texto">{children}</div>
    </div>
  );
}

/** Um número grande com legenda. */
export function Indicador({
  rotulo,
  valor,
  detalhe,
  estado,
  termo,
}: {
  rotulo: string;
  termo?: Termo;
  valor: ReactNode;
  detalhe?: ReactNode;
  estado?: "normal" | "alarme";
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[13px] font-medium text-apagado">
        {rotulo}
        {termo && <Explicacao termo={termo} />}
      </p>
      <p className={`mt-1.5 text-[1.75rem] leading-none font-semibold tracking-tight tabular-nums ${estado === "alarme" ? "text-alarme" : ""}`}>
        {valor}
      </p>
      {detalhe && <p className="mt-1.5 text-[13px] text-apagado">{detalhe}</p>}
    </div>
  );
}

/** Um cartão dividido por fios, nunca cartões iguais lado a lado. */
export function FaixaIndicadores({ children }: { children: ReactNode }) {
  return (
    <Painel className="grid grid-cols-2 gap-x-6 gap-y-6 px-6 py-5 sm:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:divide-x lg:divide-linha lg:[&>*:not(:first-child)]:pl-6">
      {children}
    </Painel>
  );
}

export function Medidor({ valor, maximo, className = "" }: { valor: number; maximo: number; className?: string }) {
  const fracao = maximo > 0 ? Math.min(1, valor / maximo) : 0;
  const perto = fracao >= 0.8;
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={valor}
      className={`h-2 overflow-hidden rounded-full bg-[#e6e8ec] ${className}`}
    >
      <div
        className={`h-full rounded-full ${perto ? "listras-perigo" : "bg-sinal"}`}
        style={{ width: `${Math.max(fracao * 100, valor > 0 ? 2 : 0)}%` }}
      />
    </div>
  );
}

/** Quanto a requisição que acabou de rodar custou, chamada por chamada. */
export function CustoDaRequisicao({ resumo }: { resumo: ResumoRastro }) {
  return (
    <Painel className="px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 text-[15px]">
        <p className="flex items-center gap-1.5 font-semibold">
          Esta requisição
          <Explicacao termo="observabilidade" />
        </p>
        <p className="text-suave">
          <span className="font-medium text-texto tabular-nums">{resumo.chamadas.length}</span> chamadas ao modelo
        </p>
        <p className="text-suave">
          <span className="font-medium text-texto tabular-nums">{fmtInteiro(resumo.tokens)}</span> tokens{" "}
          <Explicacao termo="tokens" />
        </p>
        <p className="text-suave">
          custo <span className="font-medium text-texto tabular-nums">{fmtUsd(resumo.custoUsd)}</span> <Explicacao termo="custo" />
        </p>
        <p className="text-suave">
          tempo total <span className="font-medium text-texto tabular-nums">{fmtMs(resumo.latenciaMs)}</span>
        </p>
      </div>
      <details className="group mt-3">
        <summary className="cursor-pointer text-sm text-sinal hover:underline">Ver cada chamada</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-apagado">
              <tr>
                <th className="py-1.5 pr-4 font-medium">Operação</th>
                <th className="py-1.5 pr-4 font-medium">Modelo</th>
                <th className="py-1.5 pr-4 text-right font-medium">Entrada</th>
                <th className="py-1.5 pr-4 text-right font-medium">Saída</th>
                <th className="py-1.5 pr-4 text-right font-medium">Custo</th>
                <th className="py-1.5 text-right font-medium">Latência</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {resumo.chamadas.map((c, i) => (
                <tr key={i} className="border-t border-linha">
                  <td className="py-1.5 pr-4">
                    <span className="inline-flex items-center gap-2">
                      <Lampada estado={c.status === "ok" ? "normal" : "alarme"} />
                      {c.operacao}
                    </span>
                  </td>
                  <td className="py-1.5 pr-4 text-suave">{c.modelo}</td>
                  <td className="py-1.5 pr-4 text-right">{fmtInteiro(c.tokensEntrada)}</td>
                  <td className="py-1.5 pr-4 text-right">{fmtInteiro(c.tokensSaida)}</td>
                  <td className="py-1.5 pr-4 text-right">{fmtUsd(c.custoUsd)}</td>
                  <td className="py-1.5 text-right">{fmtMs(c.latenciaMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Painel>
  );
}

/** Texto do modelo: preserva quebras, destaca **negrito** e as citações [n]. */
export function TextoResposta({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*|\[\d+\])/g);
  return (
    <div className="max-w-[72ch] text-[17px] leading-relaxed whitespace-pre-wrap">
      {partes.map((p, i) => {
        if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
        if (/^\[\d+\]$/.test(p))
          return (
            <sup key={i} className="ml-0.5 font-semibold text-sinal">
              {p}
            </sup>
          );
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
}

/** Uma nota de 1 a 5 como barra de cinco segmentos. */
export function Nota({ rotulo, valor, termo }: { rotulo: string; valor: number; termo?: Termo }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-32 shrink-0 items-center gap-1 text-suave">
        {rotulo}
        {termo && <Explicacao termo={termo} />}
      </span>
      <span className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`h-2 w-6 rounded-full ${n <= Math.round(valor) ? (valor < 3 ? "bg-alarme" : "bg-sinal") : "bg-[#e6e8ec]"}`}
          />
        ))}
      </span>
      <span className="tabular-nums">{valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} de 5</span>
    </div>
  );
}
