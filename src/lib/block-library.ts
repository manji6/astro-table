// Blockライブラリ共通のデータ取得ロジック。
// 一覧ページ(block-library/index.astro)と個別ページ(block-library/[name].astro)の
// 両方から使う。ロケール選択の純粋ロジックはblock-library-select.tsに分離してある
// (astro:contentをimportするこのファイルはVitest単体では解決できないため)。
import { getCollection } from 'astro:content';
import { parsePage } from './markdown/parse-page';
import { parseExampleId, selectBlockLibraryItems, type BlockLibraryItem, type RawExample } from './block-library-select';

export type { BlockLibraryItem } from './block-library-select';

async function loadRawExamples(): Promise<RawExample[]> {
  const examples = await getCollection('blockExamples');
  return examples.map((entry) => {
    const { name, locale } = parseExampleId(entry.id);
    return {
      name,
      locale,
      description: entry.data.description,
      category: entry.data.category,
      source: (entry.body ?? '').trim(),
      tree: parsePage(entry.body ?? ''),
    };
  });
}

export async function getBlockLibraryItems(locale?: string): Promise<BlockLibraryItem[]> {
  const raw = await loadRawExamples();
  return selectBlockLibraryItems(raw, locale);
}
