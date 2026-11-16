// Baixa o texto oficial das Normas Regulamentadoras do site do Ministério do
// Trabalho (gov.br), extrai o texto dos PDFs e grava em dados/normas/.
// Depois, "Reindexar base" na tela Busca e RAG coloca as normas no pgvector.
//
// Uso:  node scripts/baixar-normas.mjs
//
// Normas são atos oficiais (Lei 9.610/98, art. 8º, IV): o texto não tem proteção
// de direito autoral e pode ser armazenado e citado. A URL e a data de obtenção
// ficam no manifesto, para a resposta poder apontar a fonte e a versão.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractText, getDocumentProxy } from "unpdf";

const VIGENTES =
  "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes";
const ARQUIVOS =
  "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras";

// Normas que valem num canteiro de obra industrial, na versão mais recente publicada.
const NORMAS = [
  { fonte: "NR-01", titulo: "Disposições gerais e gerenciamento de riscos ocupacionais", url: `${VIGENTES}/nr-01-atualizada-2025-i-3.pdf` },
  { fonte: "NR-06", titulo: "Equipamentos de proteção individual (EPI)", url: `${VIGENTES}/nr-06-atualizada-2025-ii.pdf` },
  { fonte: "NR-10", titulo: "Segurança em instalações e serviços em eletricidade", url: `${VIGENTES}/nr-10-atualizada-2026-1.pdf` },
  { fonte: "NR-11", titulo: "Transporte, movimentação, armazenagem e manuseio de materiais", url: `${VIGENTES}/nr-11-atualizada-2016.pdf` },
  { fonte: "NR-12", titulo: "Segurança no trabalho em máquinas e equipamentos", url: `${VIGENTES}/nr-12-atualizada-2025.pdf` },
  { fonte: "NR-13", titulo: "Caldeiras, vasos de pressão, tubulações e tanques metálicos de armazenamento", url: `${VIGENTES}/nr-13-atualizada-2023-b.pdf` },
  { fonte: "NR-18", titulo: "Segurança e saúde no trabalho na indústria da construção", url: `${VIGENTES}/NR18atualizada2026I.pdf` },
  { fonte: "NR-33", titulo: "Segurança e saúde nos trabalhos em espaços confinados", url: `${ARQUIVOS}/nr-33-atualizada-2022-_retificada.pdf` },
  { fonte: "NR-35", titulo: "Trabalho em altura", url: `${VIGENTES}/nr-35-atualizada-2025-1.pdf` },
];

const PASTA = path.join(process.cwd(), "dados", "normas");

/**
 * Limpa o texto extraído do PDF: tira cabeçalhos e rodapés que se repetem em
 * toda página, números de página soltos e hifenização de fim de linha.
 * Sem isso, "NR-35 TRABALHO EM ALTURA" apareceria dezenas de vezes e poluiria a busca lexical.
 */
function limpar(texto) {
  const linhas = texto.split("\n").map((l) => l.replace(/\s+/g, " ").trim());
  const contagem = new Map();
  for (const l of linhas) if (l) contagem.set(l, (contagem.get(l) ?? 0) + 1);
  const ehItem = (l) => /^\d{1,2}(\.\d+){1,6}\.?\s/.test(l);
  return linhas
    .filter((l) => l && !/^\d{1,3}$/.test(l) && !/^p[áa]gina \d+/i.test(l))
    .filter((l) => ehItem(l) || l.length > 120 || (contagem.get(l) ?? 0) < 3)
    .join("\n")
    .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2");
}

async function baixar(norma) {
  const resposta = await fetch(norma.url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!resposta.ok) throw new Error(`${norma.fonte}: o gov.br respondeu ${resposta.status}`);
  if (!(resposta.headers.get("content-type") ?? "").includes("pdf")) throw new Error(`${norma.fonte}: a resposta não é um PDF`);
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  // O pdf.js esvazia o buffer ao ler (transfere para o worker): o tamanho é medido antes.
  const bytesPdf = bytes.length;
  const pdf = await getDocumentProxy(bytes);
  const { text, totalPages } = await extractText(pdf, { mergePages: false });
  const texto = limpar(text.join("\n"));
  const arquivo = `${norma.fonte.toLowerCase()}.txt`;
  await writeFile(path.join(PASTA, arquivo), texto, "utf8");
  return { ...norma, arquivo, obtidoEm: new Date().toISOString().slice(0, 10), paginas: totalPages, caracteres: texto.length, bytesPdf };
}

await mkdir(PASTA, { recursive: true });
const manifesto = [];
for (const norma of NORMAS) {
  try {
    const n = await baixar(norma);
    manifesto.push(n);
    console.log(`${n.fonte}: ${n.paginas} páginas, ${Math.round(n.bytesPdf / 1024)} KB de PDF, ${n.caracteres.toLocaleString("pt-BR")} caracteres de texto`);
  } catch (e) {
    console.error(`Falhou: ${e.message}`);
  }
}
await writeFile(path.join(PASTA, "normas.json"), JSON.stringify(manifesto, null, 2), "utf8");
const total = manifesto.reduce((s, n) => s + n.caracteres, 0);
// Estimativa de custo para indexar: ~4 caracteres por token em português, US$ 0,02 por milhão de tokens.
console.log(`\n${manifesto.length} de ${NORMAS.length} normas gravadas em dados/normas.`);
console.log(`Texto total: ${total.toLocaleString("pt-BR")} caracteres, cerca de ${Math.round(total / 4).toLocaleString("pt-BR")} tokens.`);
console.log(`Indexar custa cerca de US$ ${((total / 4 / 1_000_000) * 0.02).toFixed(4)} com text-embedding-3-small.`);
