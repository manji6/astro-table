#!/usr/bin/env node
// npm run new:product -- <slug>
// 雛形スクリプト。商品データのスキーマに沿った雛形をコメント付きで生成する。
// 必須項目(images/categories)は意図的に空のまま残し、`npx astro check`が
// スキーマ不備を検知できることを最終防衛ラインとして機能させる。

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const rawSlug = process.argv[2];

if (!rawSlug) {
  console.error('Usage: npm run new:product -- <slug>');
  process.exit(1);
}

const slug = rawSlug.trim().toLowerCase().replace(/\s+/g, '-');
const dir = path.join('content', 'products');
const file = path.join(dir, `${slug}.yaml`);

if (existsSync(file)) {
  console.error(`Error: ${file} already exists.`);
  process.exit(1);
}

mkdirSync(dir, { recursive: true });

const template = `# TODO: 以下すべての項目を埋めること。埋め忘れは \`npx astro check\` / \`npm run build\` が検知する。
sku: "" # TODO: 例 "SHOE-004"
images: [] # TODO: 最低1枚。例: [/images/products/${slug}-1.svg]
categories: [] # TODO: 最低1つ。既存カテゴリ一覧はcontent/taxonomy/参照
tags: []
stock: in_stock # in_stock | out_of_stock
prices:
  # TODO: オプトインしている全ロケール分の価格を埋める(このテンプレートはja-JP/en-USの2ロケール)
  ja-JP: { currency: JPY, amount: 0 }
  en-US: { currency: USD, amount: 0 }
translations:
  # TODO: オプトインしている全ロケール分の商品名・説明文を埋める
  ja-JP: { title: "", description: "" }
  en-US: { title: "", description: "" }
`;

writeFileSync(file, template);

console.log(`Created ${file}`);
console.log('');
console.log('次のステップ:');
console.log('1. 上記TODOを全て埋める(価格・商品名・カテゴリ・画像)');
console.log('2. ダミー画像を用意する(public/images/products/配下にSVG等を追加)');
console.log('3. `npx astro check` を実行し、スキーマ不備(必須項目抜け)が無いことを確認する');
console.log('4. `npm run build` でPDP/カテゴリ一覧/検索インデックスに反映されることを確認する');
