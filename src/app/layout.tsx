import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// Geist, a mesma família do Loc Polaris: neutra, legível em tamanhos pequenos e com números tabulares.
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Industrial AI Intelligence",
  description: "Assistente de IA para projetos de capital: RAG sobre documentos do projeto e NRs, roteamento de modelos, function calling e avaliação, com custo e qualidade à vista.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geist.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
