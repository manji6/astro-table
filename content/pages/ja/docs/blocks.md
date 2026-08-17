---
title: "同梱Blockリファレンス"
description: "AstroTableに同梱されている全Blockの用途・列の解釈・記法例をまとめたリファレンスです。"
pageType: "other"
---

# 同梱Blockリファレンス

AstroTableでは、GFM(GitHub Flavored Markdown)の表をビルド時に対応するAstroコンポーネント(「Block」と呼びます)へ変換します。表の1行目(ヘッダー行)の1セル目がBlock名、2行目以降が中身です。列の意味づけは**位置ベース**で、何列目が何を表すかは各Blockの実装が決めています。

このページでは、コアに同梱されている全Blockを1つずつ紹介します。実際のレンダリング結果は`/ja/block-library`ページでも確認できます。各セクションの「プレビューを表示する」からもその場で確認できます。

`/<locale>/block-library/embed/<name>`は、共通レイアウト(ヘッダー・フッター・パンくず等)を一切含まない、そのBlockのレンダリング結果だけを返す軽量な専用ページです。このページのプレビューはこれをiframeで埋め込んで実現しています。静的サイトなのでビルド時点で別ページとして生成しており、クエリパラメータやJavaScriptで実行時にヘッダー等を隠しているわけではありません(HTMLには元から含まれません)。他の全ページと同じく`/<locale>/`配下にあるため、閲覧言語に合わせたプレビューが自然に出ます(`<name>/example.<locale>.md`があればそちらを、無ければ既定の`example.md`を使います)。他ページへの埋め込みや外部ツールでのプレビュー表示にも使えます。

## hero

大きな見出し・背景画像・CTAボタンを表示するヒーローセクションです。2列のkey-value形式(1列目=キー、2列目=値)で、対応キーは`title`(テキスト)・`image`(画像)・`cta`(リンク)です。

```markdown
| hero | |
| --- | --- |
| title | AstroTableへようこそ |
| image | ![街を走るランナー](/images/campaign/running-beginner-hero.png) |
| cta | [商品を見る](/ja/docs/blocks) |
```

`image`の値は背景画像として設定されます。`cta`はMarkdownリンク記法(`[表示テキスト](リンク先)`)で書きます。

| accordion | |
| --- | --- |
| プレビューを表示する | <iframe src="/ja/block-library/embed/hero" loading="lazy" style="width:100%;min-height:420px;border:1px solid #ddd;border-radius:4px;"></iframe> |

## cards

画像・タイトル・リンクをカード形式でグリッド表示します。3列(位置ベース: 1列目=画像、2列目=タイトル、3列目=リンク先)です。

```markdown
| cards | | |
| --- | --- | --- |
| ![コミュートランニングシューズ](/images/products/commute-running-shoes.png) | コミュートランニングシューズ | /ja/docs/blocks |
| ![2WAYジムバックパック](/images/products/gym-backpack-2way.png) | 2WAYジムバックパック | /ja/docs/blocks |
```

リンク先(3列目)を指定すると、画像・タイトルを含むカード全体がリンクになります。省略すると装飾用の非リンクカードとして表示されます。3列目はMarkdownリンク記法でもプレーンなパス文字列でもかまいません。

| accordion | |
| --- | --- |
| プレビューを表示する | <iframe src="/ja/block-library/embed/cards" loading="lazy" style="width:100%;min-height:420px;border:1px solid #ddd;border-radius:4px;"></iframe> |

## columns

任意の内容を横並びのカラムとして表示します。1行が1組のカラムグループで、行内のセル数がそのままカラム数になります。

```markdown
| columns | |
| --- | --- |
| **左カラム**のテキストです。 | **右カラム**のテキストです。 |
```

セルの中身はHTMLとしてそのまま描画されるので、太字・改行・リンクなどインライン要素は自由に書けます。1行足すごとに、その下にもう1組のカラムグループが並びます。

| accordion | |
| --- | --- |
| プレビューを表示する | <iframe src="/ja/block-library/embed/columns" loading="lazy" style="width:100%;min-height:200px;border:1px solid #ddd;border-radius:4px;"></iframe> |

## table

位置ベースの解釈を**しない**唯一のBlockです。rowsをそのままHTMLの`<table>`として描画します。見た目上ただのデータ表(サイズ表など)を書きたいときに使います。

```markdown
| table | | |
| --- | --- | --- |
| サイズ | 幅 | 高さ |
| S | 20cm | 10cm |
| M | 25cm | 12cm |
```

| accordion | |
| --- | --- |
| プレビューを表示する | <iframe src="/ja/block-library/embed/table" loading="lazy" style="width:100%;min-height:220px;border:1px solid #ddd;border-radius:4px;"></iframe> |

## accordion

開閉式のFAQ等に使います。ネイティブの`<details>`/`<summary>`要素を使っており、追加のJavaScriptなしで開閉動作します。2列のkey-value形式(1列目=見出し、2列目=本文)です。

```markdown
| accordion | |
| --- | --- |
| 配送にかかる日数は? | 通常3〜5営業日でお届けします。 |
| 返品は可能ですか? | 未使用の商品は30日以内であれば返品可能です。 |
```

開閉時にはAdobe Client Data Layer(ACDL)へ`accordion_toggle`イベント(`blockName`/`label`/`state`付き)がpushされます。

| accordion | |
| --- | --- |
| プレビューを表示する | <iframe src="/ja/block-library/embed/accordion" loading="lazy" style="width:100%;min-height:220px;border:1px solid #ddd;border-radius:4px;"></iframe> |

## tabs

複数パネルの情報をタブ切替で表示します。2列のkey-value形式(1列目=タブラベル、2列目=パネル内容)で、1行が1タブです。

```markdown
| tabs | |
| --- | --- |
| サイズ | S/M/Lをご用意しています。 |
| 素材 | 表地はポリエステル100%です。 |
```

`role="tablist"`/`role="tab"`/`role="tabpanel"`を使ったアクセシブルな実装で、矢印キー(←→)によるタブ移動に対応します。

| accordion | |
| --- | --- |
| プレビューを表示する | <iframe src="/ja/block-library/embed/tabs" loading="lazy" style="width:100%;min-height:220px;border:1px solid #ddd;border-radius:4px;"></iframe> |

## modal

ポップアップ表示(モーダル)です。ネイティブの`<dialog>`要素を使っており、フォーカストラップやESCキーでの閉じる操作はブラウザ標準の挙動に任せています。2列のkey-value形式で、対応キーは`trigger`(開くボタンの文言)・`content`(モーダル本文。インライン要素のみ)です。

```markdown
| modal | |
| --- | --- |
| trigger | サイズ表を見る |
| content | S/M/Lをご用意しています。 |
```

背景(`::backdrop`)クリックでも閉じられます。

| accordion | |
| --- | --- |
| プレビューを表示する | <iframe src="/ja/block-library/embed/modal" loading="lazy" style="width:100%;min-height:220px;border:1px solid #ddd;border-radius:4px;"></iframe> |

## carousel

画像/コンテンツを切替表示するカルーセルです。2列(位置ベース: 1列目=画像(省略可)、2列目=自由記述のコンテンツ)で、コンテンツ列は`columns`と同様にセルのHTMLをそのまま描画するので、太字・改行(`<br>`)・リンクなど自由に書けます。

```markdown
| carousel (autoplay:3) | |
| --- | --- |
| ![コミュートランニングシューズ](/images/products/commute-running-shoes.png) | **コミュートランニングシューズ**<br>[詳しく見る](/ja/docs/blocks) |
| ![2WAYジムバックパック](/images/products/gym-backpack-2way.png) | 2WAYジムバックパック |
```

前後ボタン・矢印キー(←→)操作に対応します。自動再生は既定でOFFで、`autoplay`(5秒間隔)または`autoplay:<秒数>`(例: `autoplay:3`)variantを付けたときだけ有効になります。`prefers-reduced-motion`が設定されている環境では、variantの指定に関わらず自動再生を行いません。

行数によってSingle/Multipleを自動判定するため、variant指定は不要です。行が1つだけの場合は前後ボタン・ドット・自動再生を一切表示しません。ラップアラウンド(最後のスライドから先頭へ、またはその逆)時も、常に他のスライドと同じ方向にアニメーションします。

| accordion | |
| --- | --- |
| プレビューを表示する | <iframe src="/ja/block-library/embed/carousel" loading="lazy" style="width:100%;min-height:420px;border:1px solid #ddd;border-radius:4px;"></iframe> |

## quote

引用文・お客様の声(レビュー抜粋)・プルクオート表示に使います。1行のみ、2列のkey-value形式(1列目=引用本文、2列目=出典/著者名。省略可)です。

```markdown
| quote (large) | |
| --- | --- |
| このサイトのおかげでチェックアウトまでの導線がとても分かりやすくなりました。 | 佐藤様(検証チーム) |
```

`large`variantを付けると引用本文の文字サイズが大きくなります。

| accordion | |
| --- | --- |
| プレビューを表示する | <iframe src="/ja/block-library/embed/quote" loading="lazy" style="width:100%;min-height:180px;border:1px solid #ddd;border-radius:4px;"></iframe> |

## embed

YouTube/Vimeo等の外部コンテンツをiframeで埋め込み表示します。1列1行でURLを貼るだけの最小形式です。

```markdown
| embed |
| --- |
| https://www.youtube.com/watch?v=dQw4w9WgXcQ |
```

対応していないURLの場合は、埋め込みの代わりにリンクとして表示します(ビルドエラーにはなりません)。

| accordion | |
| --- | --- |
| プレビューを表示する | <iframe src="/ja/block-library/embed/embed" loading="lazy" style="width:100%;min-height:280px;border:1px solid #ddd;border-radius:4px;"></iframe> |

## video

動画を再生します。自前ホストの動画ファイルと、YouTube/Vimeo等の外部URL(`embed`Blockと同じ判定ロジック)の両方に対応します。2列のkey-value形式で、対応キーは`src`(必須。ファイルパスまたは外部URL)・`poster`(省略可、サムネイル画像)です。

```markdown
| video | |
| --- | --- |
| src | /videos/demo.mp4 |
```

`video (autoplay, loop)`のようにvariantを指定できます(autoplayを指定するとブラウザの自動再生ポリシーに対応するため`muted`も自動で付与されます)。`src`が`embed`Blockと同じパターンでYouTube/Vimeoと認識された場合は、`<video>`タグの代わりにiframe埋め込みになります。

| accordion | |
| --- | --- |
| プレビューを表示する | <iframe src="/ja/block-library/embed/video" loading="lazy" style="width:100%;min-height:280px;border:1px solid #ddd;border-radius:4px;"></iframe> |

## header

ヘッダーナビゲーションです。ページのMarkdown本文から直接呼び出すことはなく、ナビゲーション用のコンテンツファイルから読み込まれ、共通レイアウトが自動でレンダリングします。2列(位置ベース: 1列目=リンクラベル、2列目=リンク先)です。

```markdown
| header | | |
| --- | --- | --- |
| ホーム | /ja/ | |
| お問い合わせ | /ja/docs/blocks | |
```

| accordion | |
| --- | --- |
| プレビューを表示する | <iframe src="/ja/block-library/embed/header" loading="lazy" style="width:100%;min-height:120px;border:1px solid #ddd;border-radius:4px;"></iframe> |

## footer

フッターです。`header`と同じ仕組みで、専用のコンテンツファイルから読み込まれてレンダリングされます。2列(位置ベース: 1列目=リンクラベル、2列目=リンク先)です。

```markdown
| footer | | |
| --- | --- | --- |
| ホーム | /ja/ | |
```

コピーライト表記(`© <年> AstroTable`)は自動生成されます。

| accordion | |
| --- | --- |
| プレビューを表示する | <iframe src="/ja/block-library/embed/footer" loading="lazy" style="width:100%;min-height:120px;border:1px solid #ddd;border-radius:4px;"></iframe> |

## metadata・section-metadata(レンダリングされない特殊Block)

この2つは見た目上何も描画しない特殊なBlockで、ページやセクションのメタ情報を追加するために使います。

**metadata**は、frontmatterの固定項目(`title`/`description`/`ogImage`)以外の任意の`<meta>`要素をページに追加します。位置は任意ですが、他のBlockと混同しないよう文書末尾に置くのがおすすめです。

```markdown
| metadata | |
| --- | --- |
| og:type | article |
| twitter:card | summary_large_image |
```

名前が`og:`または`twitter:`で始まる場合は`property`属性、それ以外は`name`属性で`<head>`に出力されます。

**section-metadata**は、特定のセクションだけにスタイル用のクラスを付けたいときに使います。`metadata`と違い、適用範囲はそのBlockが置かれたセクションだけです。

```markdown
## セクション背景

| section-metadata | |
| --- | --- |
| style | highlight |

このセクションだけ背景色が付きます。
```

`style`の値はそのままCSSクラス名として、そのセクションを囲む`<section>`要素に追加されます(カンマ区切りで複数指定可)。クラス自体の見た目はサイト側のCSSで定義する必要があります。詳しくはBlockの拡張方法のページを参照してください。
