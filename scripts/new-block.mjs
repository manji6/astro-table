#!/usr/bin/env node
// npm run new:block -- <name> [columns]
// 雛形スクリプト。決定的な出力を生成し、AIの自由記述に頼る範囲を「型を埋める」だけに絞る。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// astro.config.mjsに`i18n:`設定があるかどうかで、多言語対応(i18nオプトイン)中かを簡易判定する。
const i18nEnabled = existsSync('astro.config.mjs') && /\bi18n\s*:/.test(readFileSync('astro.config.mjs', 'utf8'));

const rawName = process.argv[2];
const columns = Number(process.argv[3] ?? '2') || 2;

if (!rawName) {
  console.error('Usage: npm run new:block -- <name> [columns]');
  process.exit(1);
}

// Block名の正規化規則(trim → 小文字化 → 空白をハイフンに)
const name = rawName.trim().toLowerCase().replace(/\s+/g, '-');
const dir = path.join('src', 'blocks', name);

if (existsSync(dir)) {
  console.error(`Error: ${dir} already exists.`);
  process.exit(1);
}

mkdirSync(dir, { recursive: true });

const template = `---
// TODO: このBlockの用途を1行で書く。
// 変更してはいけない部分: Propsの型(rows: Cell[][] を受け取る、というBlockの基本契約)。
// ここを埋める: rows の中身をどう解釈するか(位置ベース。/ja/docs/blocks参照)。
import type { Cell } from '../../lib/markdown/parse-page';

export interface Props {
  name: string;
  variants: string[];
  rows: Cell[][];
}

const { rows } = Astro.props;
// TODO: ここでrowsの各セルを解釈する。列の意味は位置ベース(例: rows[0][0] = 1行目1列目)。
// 参考実装(模範Block): src/blocks/cards/index.astro
---

<div class="${name}">
  {/* TODO: ここにマークアップを書く。rows.map(...)でループするのが基本形。 */}
</div>

<style>
  /* TODO: 必要ならスコープドCSSをここに書く(Astroが自動でスコープする) */
</style>

<!--
  インタラクティブな操作(開閉・タブ切り替え等)が必要な場合は<script>タグを追加し、
  ACDLパターンBのpushEvent()呼び出しを検討する。
  参考: src/blocks/accordion/index.astro
-->
`;

writeFileSync(path.join(dir, 'index.astro'), template);

const headerCellValues = [name, ...Array(columns - 1).fill('')];
const headerRow = `| ${headerCellValues.join(' | ')} |`;
const delimiterRow = `| ${Array(columns).fill('---').join(' | ')} |`;
const sampleRowValues = ['(1列目の値)', ...Array(columns - 1).fill('(値)')];
const sampleRow = `| ${sampleRowValues.join(' | ')} |`;

// Blockライブラリページ用の表示サンプル。
// example.mdを置くだけで、新しいBlockが自動的に/<locale>/block-libraryへ載る。
// 多言語対応(i18n)がOnのプロジェクトでは、example.<locale>.md(例: example.en.md)を
// 追加でロケール別に用意できる(無ければexample.mdにフォールバックする)。
const exampleTemplate = `---
description: "TODO: このBlockの用途を1文で書く(Blockライブラリページに表示される)"
category: "general"
---

${headerRow}
${delimiterRow}
${sampleRow}
`;

writeFileSync(path.join(dir, 'example.md'), exampleTemplate);

console.log(`Created ${dir}/index.astro`);
console.log(`Created ${dir}/example.md`);
console.log('');
console.log('次のステップ:');
console.log('1. rowsの解釈ロジック(TODO部分)を実装する');
console.log('2. example.mdのdescription・サンプル内容を実際の使い方に合わせて書き換える');
console.log('   (このファイルがそのまま /<locale>/block-library (Blockライブラリページ) に表示される)');
if (i18nEnabled) {
  console.log('   多言語対応がOnのプロジェクトなので、example.en.md等のロケール別サンプルも');
  console.log(`   ${dir}/に追加しておくと、各言語のBlockライブラリページで正しい言語のプレビューが出る。`);
}
console.log('3. `npm run build` してBlockライブラリページ(/<locale>/block-library)で見た目を確認する');
console.log('4. 対応するテストを書く/既存テストを実行する(md)');
