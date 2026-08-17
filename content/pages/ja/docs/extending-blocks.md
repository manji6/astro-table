---
title: "既存Blockの拡張方法"
description: "variant記法、CSS/scriptのカスタマイズ、section-metadata Blockによるセクション単位のスタイル調整をまとめます。"
pageType: "other"
---

# 既存Blockの拡張方法

新しいBlockを一から作らなくても、既存のBlockを拡張・調整するだけで見た目や挙動を変えられる場面は多くあります。このページでは3つの方法を扱います。

1. variant記法で見た目のバリエーションを切り替える
2. Blockの`index.astro`に書かれたCSS/scriptを直接カスタマイズする
3. `section-metadata` Blockでセクション単位のスタイルを調整する

## 1. variant記法の活用

Block名の後に丸括弧で囲んだカンマ区切りの値を書くと、`variants`という文字列配列としてBlockコンポーネントに渡されます。

```markdown
| quote (large) | |
| --- | --- |
| このサイトのおかげでチェックアウトまでの導線がとても分かりやすくなりました。 | 佐藤様(検証チーム) |
```

`quote`Blockの実装を見ると、`variants`をそのまま`data-variants`属性に出力し、CSS側の属性セレクタ(`~=`で単語単位に一致)で判定していることが分かります。

```astro
const { rows, variants } = Astro.props;
```

```astro
<figure class="quote" data-variants={variants.join(' ')}>
  <blockquote class="quote__body">{body}</blockquote>
  {cite && <figcaption class="quote__cite">— {cite}</figcaption>}
</figure>

<style>
  .quote[data-variants~='large'] .quote__body {
    font-size: 1.75rem;
  }
</style>
```

この`variants` → `data-variants`属性 → CSS属性セレクタという流れが、AstroTableにおけるvariant記法の基本パターンです。既存Blockに新しいバリエーションを追加したい場合、多くは`index.astro`のCSSに新しい属性セレクタのルールを1つ足すだけで済みます。

variantsは常に文字列の配列としてそのまま渡されるので、`carousel (autoplay:3)`や`video (autoplay, loop)`のように、`キー:値`形式やフラグの組み合わせとして自前でパースすることもできます。`carousel`Blockの実装例です。

```astro
const autoplayVariant = variants.find((v) => /^autoplay(:\d+)?$/.test(v));
const autoplayEnabled = Boolean(autoplayVariant);
const autoplaySeconds = autoplayVariant?.includes(':') ? Number(autoplayVariant.split(':')[1]) : 5;
```

`video`Blockのように、単純なフラグ(値を持たないvariant)は`variants.includes('autoplay')`のような形でチェックするだけで十分です。

```astro
const autoplay = variants.includes('autoplay');
const loop = variants.includes('loop');
```

新しいvariantを追加する際は、既存の値と衝突しない名前を選び、`index.astro`のコメントに対応キー・対応variant一覧を書いておくと、後から触る人(将来の自分を含む)が迷いません。

## 2. CSS/scriptのカスタマイズ

各Blockの見た目・挙動は`src/blocks/<name>/index.astro`内の`<style>`・`<script>`に閉じています。Astroのスコープドスタイルの仕組みにより、あるBlockのCSSが別のBlockに漏れ出すことはありません。つまり、既存Blockの見た目を変えたい場合、まず検討すべきは「そのBlockの`index.astro`を直接編集する」ことです。外部ライブラリの上書き用CSSを別ファイルに積み上げるような回避策は不要です。

### サイト全体のトーンを揃える: CSS変数を使う

個別のBlockごとに色を決め打ちするのではなく、`src/styles/global.css`で定義されているCSS変数を使うと、サイト全体のテーマ変更が1箇所で完結します。

```css
:root {
  --color-text: #1a1a1a;
  --color-muted: #666;
  --color-border: #ddd;
  --color-accent: #2563eb;
  --color-accent-contrast: #fff;
}
```

例えば`carousel`Blockのドットのアクティブ状態は、こうした変数を参照して書かれています。

```astro
<style>
  .carousel__dot {
    background: var(--color-border, #ddd);
  }
  .carousel__dot[aria-current='true'] {
    background: var(--color-accent, #2563eb);
  }
</style>
```

ブランドカラーを変えたい場合は`global.css`の`--color-accent`を1箇所書き換えるだけで、これらの変数を参照している全Blockに反映されます。逆に、あるBlockだけ意図的に色を変えたい場合は、そのBlockの`<style>`内で直接色を指定してかまいません(スコープドスタイルなので他のBlockに影響しません)。

### 挙動のカスタマイズ例: カルーセルの自動再生間隔の既定値を変える

`carousel`Blockは`autoplay:<秒数>`variantで秒数を指定できますが、「variantを付けなければ既定で5秒」という挙動そのものを変えたい場合は、`index.astro`のfrontmatter部分を直接編集します。

```astro
// 変更前: variant未指定時は5秒
const autoplaySeconds = autoplayVariant?.includes(':') ? Number(autoplayVariant.split(':')[1]) : 5;

// 変更後: variant未指定時は8秒にする
const autoplaySeconds = autoplayVariant?.includes(':') ? Number(autoplayVariant.split(':')[1]) : 8;
```

`<script>`側も同様に直接編集できます。例えば`accordion`Blockでは開閉のたびにACDLへイベントをpushしていますが、独自の集計先を追加したい場合は同じ`<script>`ブロックに処理を足すだけです。

```astro
<script>
  import { pushEvent } from '../../lib/acdl';

  document.querySelectorAll<HTMLDetailsElement>('.accordion__item').forEach((item) => {
    item.addEventListener('toggle', () => {
      const label = item.querySelector('.accordion__title')?.textContent ?? '';
      pushEvent('accordion_toggle', { blockName: 'accordion', label, state: item.open ? 'open' : 'closed' });
      // ここに独自の計測処理を追加できる
    });
  });
</script>
```

Block自体はプレーンなAstroコンポーネントなので、フレームワーク固有の拡張ポイント(プラグイン機構やフック)を探す必要はありません。ファイルを直接編集するのが最短経路です。変更後は`npm run build`(または`npm run dev`)して`/ja/block-library/<name>`で見た目・挙動を確認してください。

## 3. section-metadata Blockでセクション単位のスタイル調整

Block自体を編集せずに、「このページのこの1セクションだけ背景色を変えたい」といった調整をしたい場合は`section-metadata`Blockが便利です。セクション内に置くと、そのセクションを囲む`<section>`要素にCSSクラスが追加されます。

```markdown
## セクション背景

| section-metadata | |
| --- | --- |
| style | highlight |

このセクションだけ背景色が付きます。
```

`style`の値(この例では`highlight`)は`<section class="block-section highlight">`のようにそのまま追加されるだけで、クラス名自体に特別な意味はありません。見た目は`src/styles/global.css`側で自分で定義する必要があります。

```css
.highlight {
  padding: 1.5rem;
  background: #f5f0ff;
  border-radius: 4px;
}
```

複数のクラスをカンマ区切りで指定することもできます(`style`列に`highlight, no-padding`のように書けば、両方のクラスが追加されます)。用途としては、キャンペーンセクションだけ強調したい、特定のセクションの余白を詰めたい、といった「ページ単位ではなくセクション単位」の調整に向いています。

なお、`section-metadata`はセクション内のどこに置いても構いませんが、実際には何も描画されない(ビルド時に除去される)ため、セクションの先頭か末尾にまとめて置くと本文の見通しがよくなります。ページ全体に対して`<meta>`タグを追加したい場合は、`section-metadata`ではなく`metadata`Blockを使います(両者の違いは[同梱Blockリファレンス](/ja/docs/blocks)を参照してください)。
