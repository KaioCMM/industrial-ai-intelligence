// Divisão em trechos. Duas estratégias, porque os documentos têm estruturas diferentes.

/**
 * Documentos de projeto: por parágrafo, com teto de caracteres.
 * Parágrafo é a unidade natural de um relatório ou ata: cortar por número fixo
 * de caracteres partiria uma decisão do comitê ao meio. O último parágrafo curto
 * de um trecho se repete no início do próximo (sobreposição) para não perder a ligação.
 */
export function dividirEmTrechos(texto: string, maxCaracteres = 900): string[] {
  const paragrafos = texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return empacotar(paragrafos, maxCaracteres, "\n\n", true);
}

/** Linha que começa um item numerado de NR: "18.4", "18.4.2", "35.1.2.1"... */
const INICIO_ITEM = /^\d{1,2}(\.\d+){1,6}\.?\s/;

/**
 * Normas regulamentadoras: por item numerado.
 * O item é a unidade que as pessoas citam ("o que diz o 35.1.2?"), então um
 * trecho nunca começa no meio de um item. Itens curtos vizinhos se juntam até o
 * teto; um item longo demais é quebrado por frases. As quebras de linha do PDF
 * caem no meio das frases, por isso as linhas de um mesmo item são unidas.
 */
export function dividirNorma(texto: string, maxCaracteres = 1200): string[] {
  const itens: string[] = [];
  let atual = "";
  for (const bruta of texto.split("\n")) {
    const linha = bruta.trim();
    if (!linha) continue;
    if (INICIO_ITEM.test(linha) && atual) {
      itens.push(atual);
      atual = linha;
    } else {
      atual = atual ? `${atual} ${linha}` : linha;
    }
  }
  if (atual) itens.push(atual);

  // Título de seção ("35.2 Responsabilidades") vai junto com o item seguinte:
  // sozinho no fim de um trecho, ele separaria o título do conteúdo dele.
  const comTitulos: string[] = [];
  for (let i = 0; i < itens.length; i++) {
    const ehTitulo = itens[i].length < 80 && !/[.:;]$/.test(itens[i]) && i + 1 < itens.length;
    if (ehTitulo) itens[i + 1] = `${itens[i]}\n${itens[i + 1]}`;
    else comTitulos.push(itens[i]);
  }

  const pedacos = comTitulos.flatMap((item) => (item.length <= maxCaracteres ? [item] : quebrarPorFrases(item, maxCaracteres)));
  return empacotar(pedacos, maxCaracteres, "\n", false);
}

/**
 * Quebra só onde a pontuação é seguida de espaço: o ponto de "35.3.1" não é fim de frase.
 * Cada pedaço depois do primeiro começa com "(item 6.5.1, continuação)": sem isso,
 * um trecho que começa em "c) macacão..." não diz de qual item é, e a citação se perde.
 */
function quebrarPorFrases(texto: string, max: number): string[] {
  const numero = texto.match(INICIO_ITEM)?.[0].trim().replace(/\.$/, "");
  const frases = texto.split(/(?<=[.;:])\s+/).filter(Boolean);
  const reserva = numero ? 40 : 0;
  return empacotar(frases, max - reserva, " ", false).map((p, i) => (i > 0 && numero ? `(item ${numero}, continuação) ${p}` : p));
}

function empacotar(partes: string[], max: number, separador: string, sobrepor: boolean): string[] {
  const trechos: string[] = [];
  let atual: string[] = [];
  let tamanho = 0;
  for (const parte of partes) {
    if (atual.length > 0 && tamanho + parte.length > max) {
      trechos.push(atual.join(separador));
      const ultimo = atual[atual.length - 1];
      const repetir = sobrepor && ultimo.length < max / 3;
      atual = repetir ? [ultimo] : [];
      tamanho = repetir ? ultimo.length : 0;
    }
    atual.push(parte);
    tamanho += parte.length;
  }
  if (atual.length > 0) trechos.push(atual.join(separador));
  return trechos;
}
