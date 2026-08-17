---
name: add-product
description: 商品データを追加する(commerceモジュール使用時)。「この商品を追加して」「商品データを作って」等で使う。
---

# add-product: 商品データの追加

参照: `/ja/docs/commerce`、`/ja/docs/i18n`、`/ja/docs/ai-workflows`

## 手順

1. **ヒアリング**: 商品名・カテゴリ・SKU・在庫状態を確認する。多言語対応(i18n)をオプトインしている場合は、ロケールごとの価格・商品名・説明文も確認する(このテンプレートはja-JP/en-USの2ロケール)。

2. **雛形生成**: `npm run new:product -- <slug>` を実行し、`content/products/<slug>.yaml` の雛形(TODOコメント付き)を生成する。

3. **記入**: TODOを全て埋める。
   - `sku`: 一意な商品コード
   - `images`: 最低1枚。画像が用意できない場合はプレースホルダーSVGを`public/images/products/`に追加する
   - `categories`: 既存カテゴリ一覧は`content/taxonomy/categories-<locale>.yaml`参照。新しいカテゴリを追加する場合は全ロケールのtaxonomyファイルにも表示名を追加する
   - `prices`/`translations`: オプトインしている全ロケール分を埋める

4. **検証**(最終防衛ライン、Skillの手引きだけに頼らない):
   - `npx astro check` を実行し、スキーマ不備(必須項目抜け・型不一致)が無いか確認する。
   - `npm run build` を実行し、PDP・カテゴリ一覧・検索インデックス(`products-index.json`)に正しく反映されることを確認する。

## 注意

- 1商品1ファイルの原則を守り、ロケールごとにファイルを分割しない(`prices`/`translations`のみロケール別)。
- SKU・画像・カテゴリキー・在庫状態はロケール非依存の共通項目。
