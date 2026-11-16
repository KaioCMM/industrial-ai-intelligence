import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents e partialPrefetching vinham ligados pelo create-next-app 16.4 e foram
  // desligados de propósito. As telas deste app são componentes de cliente que buscam
  // dados nas rotas de API: não há conteúdo do servidor para pré-renderizar ou pré-carregar.
  // Ligados, a validação de "navegação instantânea" do modo de desenvolvimento entrava em
  // laço com a casca do painel (que lê a URL) e recarregava a página sem parar.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
