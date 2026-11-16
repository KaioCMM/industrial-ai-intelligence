"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Abertura } from "./abertura";
import { GradeCobrinha } from "./grade-cobrinha";
import { Trilho } from "./trilho";

/**
 * Casca do painel: trilho lateral de vidro + conteúdo.
 * Na entrada pela raiz (/), a abertura cobre o sistema; ao navegar entre telas
 * a casca não remonta, então a abertura não volta. Recarregar a raiz mostra de novo.
 */
export function Casca({ children }: { children: React.ReactNode }) {
  const [abrindo, setAbrindo] = useState(usePathname() === "/");

  return (
    <div data-casca data-abrindo={abrindo || undefined} className="min-h-dvh md:grid md:grid-cols-[284px_minmax(0,1fr)]">
      {/* A grade fica atrás de tudo; o conteúdo sobe uma camada (relative z-10) para ficar por cima dela. */}
      <GradeCobrinha />
      <Trilho />
      <main id="conteudo" className="relative z-10 min-w-0 px-4 py-8 sm:px-8 md:px-10 md:py-12">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
      {abrindo && <Abertura aoTerminar={() => setAbrindo(false)} />}
    </div>
  );
}
