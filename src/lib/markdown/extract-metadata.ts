import type { PageTree, Section } from './parse-page';

export type MetadataEntry = { name: string; value: string };

// metadata Blockはページ本文に描画されない特殊Block。
// ここでtreeから抽出・除去し、呼び出し側(pages)がBase.astroへheadのmetaタグとして渡す。
export function extractMetadata(tree: PageTree): { metadata: MetadataEntry[]; tree: PageTree } {
  const metadata: MetadataEntry[] = [];

  const sections: Section[] = tree.sections
    .map((section) => ({
      children: section.children.filter((child) => {
        if (child.type !== 'block' || child.name !== 'metadata') return true;
        for (const row of child.rows) {
          const [nameCell, valueCell] = row;
          if (!nameCell?.text) continue;
          metadata.push({ name: nameCell.text, value: valueCell?.text ?? '' });
        }
        return false;
      }),
    }))
    .filter((section) => section.children.length > 0);

  if (metadata.length === 0) return { metadata, tree };
  return { metadata, tree: { sections } };
}
