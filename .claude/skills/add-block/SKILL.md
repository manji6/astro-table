---
name: add-block
description: 新しいBlock(表=Block記法で使う再利用可能なコンポーネント)をAstroTableに追加する。「Blockを追加して」「〜のセクションを作って」等で使う。
---

# add-block: 新しいBlockの追加

参照: `/ja/docs/blocks`(Block記法・パース層)、`/ja/docs/creating-blocks`、`/ja/docs/ai-workflows`

## 手順

1. **ヒアリング**: Block名と用途を確認する。参考にしたい既存サイトの見た目や、[AEM Block Collection](https://github.com/adobe/aem-block-collection)に近い実装があれば教えてもらう。列数(何列のデータを扱うか)も確認する。

2. **雛形生成**: `npm run new:block -- <name> <columns>` を実行し、`src/blocks/<name>/index.astro` の雛形(TODOコメント付き)を生成する。同時に、正しい列数でヘッダー行の空セルを埋めたMarkdown表記例が出力されるので控えておく。

3. **実装**:
   - AEM Block Collectionの参考実装がある場合: その`decorate()`ロジック(行・列をどう解釈してHTMLを組み立てているか)とCSSを読み、同じ`rows`(`Cell[][]`)を受け取るAstroコンポーネントとして翻訳する。
   - 参考実装がない場合: 要件から直接、雛形のTODO部分を実装する。
   - 迷ったら `src/blocks/cards/index.astro`(模範Block、コメント厚め)を参考にする。
   - **列の意味づけは位置ベース**であること(列名を明示する拡張記法は使わない)を厳守する。

4. **インタラクティブな挙動**: モーダル開閉・タブ切り替え・アコーディオン等の操作がある場合は、`<script>`内で`src/lib/acdl.ts`の`pushEvent('<blockname>_<action>', {...})`を呼ぶことを検討する(ACDLパターンB)。参考: `src/blocks/accordion/index.astro`。

5. **ビルド確認**: 手順2で控えたMarkdown表記例を使った簡単なテストページ(`content/pages/<locale>/*.md`)を作り、`npm run build`で描画を確認する。

6. **Blockライブラリ用サンプルの仕上げ**: 手順2で`src/blocks/<name>/example.md`の雛形(TODOコメント付き)も一緒に生成されている。`description`(このBlockが何のためのものか、1文)と表の中身を実際の使い方に合わせて書き換える。このファイルを置いておくだけで、`/<locale>/block-library`(Blockライブラリページ)に自動的にレンダリング結果とソースが載る。多言語対応(i18n)がOnのプロジェクトでは、`example.<locale>.md`(例: `example.en.md`)を追加でロケール別に用意する(無ければ`example.md`にフォールバックする)。

7. **テスト**(テストファーストルールに従う。`/ja/docs/testing`参照):
   - Blockコンポーネント自体の単体テストは現時点でスコープ外。
   - パース層のテスト(`tests/parse-page.test.ts`)に影響がないか`npm run test`で確認する。
   - 確認用に作ったテストページはコミット対象か一時ファイルかを判断し、不要なら削除する。

## 注意

- AEM Boilerplate/Block Collectionのコードをそのままコピーしてリポジトリに取り込まない(参考にして書き起こすのみ)。
- 新しいBlockを追加する = ディレクトリを1つ足すだけ、という設計思想を壊さない。
