import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Root, RootContent, Table, TableRow, TableCell, PhrasingContent } from 'mdast';

export type Cell = {
  html: string;
  text: string;
  images: Array<{ src: string; alt: string }>;
  links: Array<{ href: string; text: string }>;
};

export type BlockNode = {
  type: 'block';
  name: string;
  variants: string[];
  rows: Cell[][];
};

export type ProseNode = { type: 'prose'; html: string };

// metadataは常に空。section-metadata Blockを抽出する
// extract-section-metadata.tsだけが値を設定する。パース層自体は
// このBlockの意味を一切解釈しない。
export type Section = { children: Array<BlockNode | ProseNode>; metadata?: Record<string, string> };

export type PageTree = { sections: Section[] };

const processor = unified().use(remarkParse).use(remarkGfm);

// パース層。Block固有の解釈は持たない純粋関数。
// 未知Block名の解決・ビルドエラー化はレンダリング層(BlockRenderer)の責務(§3.5)。
export function parsePage(markdown: string): PageTree {
  const tree = processor.parse(markdown) as Root;
  return {
    sections: splitSections(tree.children).map((children) => ({
      children: groupChildren(children),
    })),
  };
}

function splitSections(nodes: RootContent[]): RootContent[][] {
  const sections: RootContent[][] = [[]];
  for (const node of nodes) {
    if (node.type === 'thematicBreak') {
      sections.push([]);
    } else {
      sections[sections.length - 1].push(node);
    }
  }
  return sections.filter((section) => section.length > 0);
}

function groupChildren(nodes: RootContent[]): Array<BlockNode | ProseNode> {
  const result: Array<BlockNode | ProseNode> = [];
  let proseBuffer: RootContent[] = [];

  const flushProse = () => {
    if (proseBuffer.length === 0) return;
    result.push({ type: 'prose', html: nodesToHtml(proseBuffer) });
    proseBuffer = [];
  };

  for (const node of nodes) {
    if (node.type === 'table') {
      flushProse();
      result.push(tableToBlockNode(node));
    } else {
      proseBuffer.push(node);
    }
  }
  flushProse();
  return result;
}

const BLOCK_NAME_PATTERN = /^(.*?)(?:\s*\(([^)]*)\))?$/;

function normalizeBlockName(raw: string): { name: string; variants: string[] } {
  const match = BLOCK_NAME_PATTERN.exec(raw.trim());
  const base = (match?.[1] ?? raw).trim();
  const variantsRaw = match?.[2];
  const name = base.toLowerCase().replace(/\s+/g, '-');
  const variants = variantsRaw
    ? variantsRaw
        .split(',')
        .map((variant) => variant.trim())
        .filter(Boolean)
    : [];
  return { name, variants };
}

function tableToBlockNode(table: Table): BlockNode {
  const [headerRow, ...bodyRows] = table.children;
  // ヘッダー行の列数(= デリミタ行の列数。GFM上、両者は必ず一致する)を正とする。
  // 本文行の列数はremark-gfmのmdast上では揃わないことがある(行ごとに実際のセル数のまま)ため、
  // ここで列数を揃える(超過セルは切り捨て、不足セルは空セルで埋める)。
  const columnCount = headerRow.children.length;
  const headerText = mdastToString(headerRow.children[0]);
  const { name, variants } = normalizeBlockName(headerText);
  const rows = bodyRows.map((row: TableRow) => normalizeRowCells(row.children, columnCount));
  return { type: 'block', name, variants, rows };
}

function normalizeRowCells(cells: TableCell[], columnCount: number): Cell[] {
  const normalized = cells.slice(0, columnCount).map(cellToCell);
  while (normalized.length < columnCount) {
    normalized.push(emptyCell());
  }
  return normalized;
}

function emptyCell(): Cell {
  return { html: '', text: '', images: [], links: [] };
}

function cellToCell(cell: TableCell): Cell {
  const images: Array<{ src: string; alt: string }> = [];
  const links: Array<{ href: string; text: string }> = [];
  collectInline(cell.children, images, links);
  return {
    html: nodesToHtml(cell.children),
    text: mdastToString(cell),
    images,
    links,
  };
}

function collectInline(
  nodes: PhrasingContent[],
  images: Array<{ src: string; alt: string }>,
  links: Array<{ href: string; text: string }>,
): void {
  for (const node of nodes) {
    if (node.type === 'image') {
      images.push({ src: node.url, alt: node.alt ?? '' });
    } else if (node.type === 'link') {
      links.push({ href: node.url, text: mdastToString(node) });
    }
    if ('children' in node && Array.isArray(node.children)) {
      collectInline(node.children as PhrasingContent[], images, links);
    }
  }
}

function nodesToHtml(nodes: RootContent[] | PhrasingContent[]): string {
  const root: Root = { type: 'root', children: nodes as RootContent[] };
  // allowDangerousHtml: 標準CommonMarkの仕様通り、本文中の生HTMLをそのまま通す。
  // Block固有の解釈ではなく、プレーンなMarkdown標準機能の有効化。
  const hast = toHast(root, { allowDangerousHtml: true });
  return hast ? toHtml(hast, { allowDangerousHtml: true }) : '';
}
