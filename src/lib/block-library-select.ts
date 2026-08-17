// block-library.tsのロケール選択ロジックを、astro:content非依存の純粋関数として切り出したもの。
// astro:contentをimportするモジュールはVitest単体では解決できないため、単体テスト対象を
// このファイルに分離している。
import type { PageTree } from './markdown/parse-page';

export type BlockLibraryItem = {
  name: string;
  description: string;
  category: string;
  source: string;
  tree: PageTree;
};

export type RawExample = {
  name: string;
  // nullは既定(example.md、ロケール非依存/日本語)。それ以外はexample.<locale>.mdの上書き。
  locale: string | null;
  description: string;
  category: string;
  source: string;
  tree: PageTree;
};

// globローダーのid(例: "quote/example"、"quote/exampleen")からBlock名とロケールを取り出す。
// ドットは拡張子扱いでidから失われるため、"example.en.md"は"exampleen"になる。
export function parseExampleId(id: string): { name: string; locale: string | null } {
  const match = id.match(/^([^/]+)\/example([a-z]{2})?$/);
  return { name: match?.[1] ?? id, locale: match?.[2] ?? null };
}

// localeを指定すると、該当ロケールのexample.<locale>.mdがあればそちらを優先する
// (無ければexample.mdへフォールバックする)。指定しなければ常にexample.md(既定)を使う。
export function selectBlockLibraryItems(raw: RawExample[], locale?: string): BlockLibraryItem[] {
  const byName = new Map<string, { default?: RawExample; localized?: RawExample }>();
  for (const item of raw) {
    const entry = byName.get(item.name) ?? {};
    if (item.locale === null) entry.default = item;
    else if (item.locale === locale) entry.localized = item;
    byName.set(item.name, entry);
  }
  return [...byName.entries()]
    .map(([name, { default: defaultItem, localized }]) => {
      const chosen = localized ?? defaultItem;
      if (!chosen) throw new Error(`block-library: "${name}"にexample.mdがありません。`);
      return {
        name,
        description: chosen.description,
        category: chosen.category,
        source: chosen.source,
        tree: chosen.tree,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
