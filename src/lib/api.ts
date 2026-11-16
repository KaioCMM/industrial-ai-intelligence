// Chamada às rotas da API a partir do navegador. Toda rota devolve { erro }
// com uma frase pronta quando falha, e é essa frase que aparece na tela.

export async function chamarApi<T>(url: string, corpo?: unknown): Promise<T> {
  const resposta = await fetch(url, {
    method: corpo === undefined ? "GET" : "POST",
    headers: corpo === undefined ? undefined : { "content-type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    cache: "no-store",
  });
  const json = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(json.erro ?? `A requisição falhou com status ${resposta.status}.`);
  // Avisa o trilho lateral que o gasto do dia mudou.
  if (corpo !== undefined) window.dispatchEvent(new Event("telemetria:atualizada"));
  return json as T;
}
