import type { Trecho } from "./tipos";

/**
 * Monta o contexto exatamente como o modelo o recebe: trechos numerados, com fonte e
 * título. O juiz usa a mesma função: se ele recebesse menos que o modelo (só o
 * conteúdo, sem o título), puniria como "sem apoio" uma resposta que cita a origem
 * certa. Foi o que aconteceu no caso "causas do atraso" da avaliação de 16/11/2026.
 */
export function formatarContexto(trechos: Pick<Trecho, "fonte" | "titulo" | "conteudo">[]): string {
  return trechos.map((t, i) => `[${i + 1}] ${t.fonte}: ${t.titulo}\n${t.conteudo}`).join("\n\n");
}
