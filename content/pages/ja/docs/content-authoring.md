---
title: "Markdownでページを書く"
description: "frontmatter・本文・Block記法・セクション区切りなど、ページの書き方"
pageType: "other"
---

# Markdownでページを書く

AstroTableのページは、`content/pages/`配下に置かれたMarkdownファイルです。多言語対応(i18n)をオプトインしている場合は、ロケール別のディレクトリ(`ja/`・`en/`)に分かれます。

```
content/pages/
  ja/
    index.md         → /ja/(トップページ)
    about.md         → /ja/about
  en/
    index.md         → /en/
    about.md         → /en/about
```

ファイルパス(拡張子・ロケールディレクトリを除いた部分)がそのままURLパスになります。ファイル名`index.md`は特別扱いされ、そのディレクトリの「/」にルーティングされます(例: `ja/index.md` → `/ja/`)。

---

## Frontmatter

各ページの先頭には、以下のようなYAML frontmatterを書きます。

```yaml
---
title: "ページタイトル"
description: "meta descriptionに使われる説明文(省略可)"
pageType: "other"
---
```

利用できるフィールドは次の通りです。

- `title`(必須) — `<title>`タグに使われます
- `description`(省略可) — meta descriptionおよびog:descriptionに使われます
- `pageType`(省略可、既定値`other`) — ページの種別を表す値です。`top`・`campaign`・`category`・`search`・`product`・`cart`・`checkout`・`confirmation`・`order-complete`・`other`のいずれかを指定できます
- `ogImage`(省略可) — OGP画像のパスです
- `noindex`(省略可、既定値`false`) — `true`にすると`<meta name="robots" content="noindex">`を出力します

frontmatterのスキーマが不正な値だと、`npm run build`時にエラーになります。

---

## 本文: 通常コンテンツとBlock

本文は素のGFM(GitHub Flavored Markdown)です。見出し・段落・リスト・画像・リンクなどはそのままレンダリングされます。

```markdown
# 見出し

これは通常の段落です。**強調**や[リンク](/ja/about)も書けます。

- リスト項目1
- リスト項目2
```

GFMの表(テーブル)だけは特別扱いされ、「Block」という再利用可能なコンポーネントとして展開されます。1行目1セル目がBlock名になり、2行目以降がそのBlockへ渡されるデータになります。

```markdown
| cards | | |
| --- | --- | --- |
| ![shoes](/images/shoes.svg) | ランニングシューズ | /ja/detail/running-shoes |
```

この例では`cards`という名前のBlockコンポーネントが呼び出され、行のデータ(画像・商品名・リンク先)が渡されます。実際に使えるBlockの一覧と書き方は、開発サーバー起動後に`/ja/block-library`で確認できます。

**注意: 表として書けるのは、既に用意されているBlock名だけです。** 対応するBlockコンポーネントが存在しない名前の表を書くと、ビルド時にエラーになります。

---

## ボタン(CTAリンク)

段落中にCTAボタンを置きたい場合は、標準CommonMarkの機能である生HTMLをそのまま本文に書きます。専用の記法・専用Blockは用意していません。

```markdown
新商品が入荷しました。<a href="/sale" class="button button--primary">セールを見る</a>ぜひチェックしてください。
```

`button`(基本形)・`button--primary`(強調)・`button--secondary`(控えめ)のクラスが用意されています。ページ遷移を伴わない操作(モーダルを開くなど)は、その動作を持つ個別のBlockで対応します。

---

## セクション区切り

`---`(thematic break、Markdown標準のHR記法)を使うと、ページを複数のセクションに分割できます。特別な拡張構文ではなく、標準のCommonMark記法です。

```markdown
# ファーストビュー

ここまでが1つ目のセクション。

---

## 2つ目のセクション

ここからは別セクション扱いになります。
```

セクションはビルド後、それぞれ独立した`<section>`要素として出力されます。このページ自体も、見出しごとに`---`でセクションを区切って書かれています。

---

## ページのmeta要素を追加する(metadataブロック)

frontmatterの固定項目(`title`・`description`・`ogImage`)以外に、任意の`<meta>`要素を追加したい場合は`metadata`という名前のBlockを本文に置きます。何もレンダリングされない特殊なBlockで、位置は任意です。

```markdown
| metadata | |
| --- | --- |
| og:type | article |
| twitter:card | summary_large_image |
```

名前が`og:`または`twitter:`で始まる場合は`property`属性、それ以外は`name`属性で`<head>`に出力されます。

---

## セクションにスタイルを付ける(section-metadataブロック)

特定のセクションだけ背景色を付けたいといった場合は、そのセクション内に`section-metadata`という名前のBlockを置きます。適用範囲はそのBlockが置かれたセクションだけです。

```markdown
## セクション背景

| section-metadata | |
| --- | --- |
| style | highlight |

このセクションだけ背景色が付きます。
```

`style`の値はそのままCSSクラス名としてセクションに追加されます。クラスの見た目自体は、サイト側のCSSで定義します。

---

## ページ内リンクを書くときの注意(ロケールプレフィックス)

多言語対応をオプトインしている場合、ページ内のリンク・画像パスにロケールプレフィックス(`/ja/...`・`/en/...`)を自分で書く必要があります。Blockやパース層が自動でロケールを補完する仕組みはありません。

```markdown
<!-- content/pages/ja/about.md -->
[トップに戻る](/ja/)
```

---

## ヘッダー・フッターの編集

ヘッダー(`content/nav/<locale>.md`)とフッター(`content/footer/<locale>.md`)も、通常のページと同じBlock記法で書きます。1行目1セル目が`header`・`footer`(対応するBlock名)になっている表がそのまま使われます。

```markdown
<!-- content/nav/ja.md -->
| header | | |
| --- | --- | --- |
| ホーム | /ja/ | |
| お問い合わせ | /ja/contact | |
```

---

## パンくずリスト(自動表示)

ページのディレクトリ階層に応じて、パンくずリストがヘッダー直下に自動で表示されます。何かを書く必要はありません。各階層のラベルは、対応する`index.md`の`title`から自動で引かれます。トップページ(`content/pages/ja/index.md`)ではパンくずは表示されません。

---

## ルーティングの仕組み(参考)

コンテンツページのルーティングは、`content/pages/`配下の全ファイルをファイルパス(ロケール込み)ごとにURLへマッピングする汎用ルートが担っています。ページを新規追加する際にコードの変更は不要で、Markdownファイルを置くだけで新しいURLとして公開されます。
