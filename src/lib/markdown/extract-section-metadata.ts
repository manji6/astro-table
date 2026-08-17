import type { PageTree, Section } from './parse-page';

// section-metadata Blockはセクション本文に描画されない特殊Block(の
// metadata Blockと同じ「副作用系Block」パターン)。ここでtreeから抽出・除去し、
// そのセクション自身のmetadataフィールドに格納する(ページ全体ではなく、置かれた
// セクションだけに適用するため)。
export function extractSectionMetadata(tree: PageTree): PageTree {
  const sections: Section[] = tree.sections.map((section) => {
    const metadata: Record<string, string> = {};
    const children = section.children.filter((child) => {
      if (child.type !== 'block' || child.name !== 'section-metadata') return true;
      for (const row of child.rows) {
        const [keyCell, valueCell] = row;
        if (!keyCell?.text) continue;
        metadata[keyCell.text.trim().toLowerCase()] = valueCell?.text ?? '';
      }
      return false;
    });

    return Object.keys(metadata).length > 0 ? { children, metadata } : { children };
  });

  return { sections };
}
