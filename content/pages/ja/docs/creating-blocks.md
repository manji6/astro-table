---
title: "新しいBlockの作り方"
description: "npm run new:blockでの雛形生成から、rowsの実装、ビルド確認までの手順をまとめます。"
pageType: "other"
---

# 新しいBlockの作り方

新しいBlockを追加するというのは、実質的に`src/blocks/<name>/index.astro`を1つ書くことです。Block記法そのものの仕組み(列の解釈が位置ベースであること等)は[同梱Blockリファレンス](/ja/docs/blocks)を参照してください。ここでは、ゼロから1つのBlockを作り上げる手順を説明します。

## 1. 雛形を生成する

```bash
npm run new:block -- <name> [columns]
```

`<name>`が新しいBlockの名前、`[columns]`は扱う列数です(省略時は2列)。例えば3列のBlockを作る場合:

```bash
npm run new:block -- announcement-bar 3
```

このコマンドは、Block名を「前後の空白を除去 → 小文字化 → 内部の連続空白をハイフンに変換」で正規化してから、以下の2ファイルを生成します。

- `src/blocks/announcement-bar/index.astro`(実装の雛形、TODOコメント付き)
- `src/blocks/announcement-bar/example.md`(表示サンプルの雛形。`/ja/block-library`ページに自動的に載ります)

同時に、正しい列数でヘッダー行の空セルを埋めたMarkdown表記例がコンソールに出力されるので、控えておくと後の確認作業がスムーズです。既に同名のディレクトリが存在する場合はエラーで停止します。

## 2. rowsの解釈ロジックを実装する

生成された`index.astro`には、次の形のPropsが最初から定義されています(この型は変更しないでください。Blockの基本契約です)。

```astro
export interface Props {
  name: string;       // 正規化済みBlock名
  variants: string[]; // variant記法で指定された値
  rows: Cell[][];      // 本文の各行・各列(ヘッダー行は含まない)
}
```

`Cell`は次のような形をしています。

```ts
type Cell = {
  html: string;                                  // セル内インラインMarkdownのHTML化結果
  text: string;                                  // プレーンテキスト抽出
  images: Array<{ src: string; alt: string }>;   // セル内の画像(複数可)
  links: Array<{ href: string; text: string }>;  // セル内のリンク(複数可)
};
```

`Cell`が`html`だけでなく`text`/`images`/`links`も持っているのは、「このセルは画像か、リンクか、テキストか」をHTML再パースなしで判定できるようにするためです。実装では、`rows`から位置ベースでセルを取り出し、意味づけを与えます。

模範実装として`src/blocks/cards/index.astro`が参考になります。3列(画像・タイトル・リンク先)を解釈する実例です。

```astro
---
import type { Cell } from '../../lib/markdown/parse-page';

export interface Props {
  name: string;
  variants: string[];
  rows: Cell[][];
}

const { rows, variants } = Astro.props;
---

<ul class="cards" data-variants={variants.join(' ')}>
  {rows.map((row) => {
    const [imageCell, titleCell, linkCell] = row;
    const image = imageCell?.images[0];
    const href = linkCell?.links[0]?.href ?? linkCell?.text;
    return (
      <li class="cards__item">
        {image && <img class="cards__image" src={image.src} alt={image.alt} />}
        <p class="cards__title">{titleCell?.text}</p>
        {href && <a class="cards__link" href={href}>詳しく見る</a>}
      </li>
    );
  })}
</ul>

<style>
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
</style>
```

2列のBlockをkey-value形式(1列目=キー、2列目=値)として扱いたい場合は、`hero`や`modal`のように`rows`をループして`Record<string, Cell>`に変換するパターンが便利です。

```astro
const config: Record<string, Cell> = {};
for (const row of rows) {
  const [keyCell, valueCell] = row;
  if (keyCell && valueCell) {
    config[keyCell.text.trim().toLowerCase()] = valueCell;
  }
}
```

## 3. インタラクティブな挙動が必要な場合

開閉・タブ切り替え・カルーセル送りなどの操作が必要なら、`<script>`タグを追加します。Astroが自動でバンドル・スコープしてくれるので、他のBlockのスクリプトと衝突する心配はありません。

ユーザー操作を計測したい場合は`src/lib/acdl.ts`の`pushEvent()`を呼びます。`accordion`Blockの実装が参考になります。

```astro
<script>
  import { pushEvent } from '../../lib/acdl';

  document.querySelectorAll<HTMLDetailsElement>('.accordion__item').forEach((item) => {
    item.addEventListener('toggle', () => {
      const label = item.querySelector('.accordion__title')?.textContent ?? '';
      pushEvent('accordion_toggle', { blockName: 'accordion', label, state: item.open ? 'open' : 'closed' });
    });
  });
</script>
```

同一ページに同じBlockが複数回置かれる可能性がある場合(モーダルやタブなど)は、`crypto.randomUUID().slice(0, 8)`などでインスタンスごとに一意なIDを振り、DOM要素の`id`衝突を避けてください。

## 4. example.mdを仕上げる

雛形生成時に一緒に作られた`example.md`の`description`(このBlockが何のためのものかを1文で)と、表の中身を実際の使い方に合わせて書き換えます。このファイルを置いておくだけで、`/ja/block-library`ページに自動的にレンダリング結果とMarkdownソースの両方が載ります。

```markdown
---
description: "このBlockの用途を1文で書く"
category: "content"
---

| announcement-bar | | |
| --- | --- | --- |
| セール開催中 | 詳しくはこちら | /ja/sale |
```

## 5. ビルド確認

```bash
npm run build
```

または`npm run dev`で開発サーバーを立ち上げ、`/ja/block-library/<name>`にアクセスすると、そのBlockのレンダリング結果とソースの両方をブラウザ上で確認できます。

未知のBlock名(正規化後の名前に対応する`src/blocks/<name>/index.astro`が存在しない場合)は、ビルド時に明確なエラーで検出されます。既存のBlock名一覧もエラーメッセージに表示されるため、タイポにもすぐ気づけます。黙って素の表として描画される、というフォールバックはありません。

## 6. テスト

Block記法のパース処理(表からBlockノードへの変換)自体のテストは`tests/parse-page.test.ts`にまとまっています。新しいBlockを追加してもパース層のロジックは変わらないため、通常はこのテストへの影響はありませんが、念のため実行しておきます。

```bash
npm run test
```

Blockコンポーネント自体(`index.astro`)の見た目に対する単体テストは必須ではありませんが、複雑な状態管理(カルーセルの位置計算など)を持つBlockを作る場合は、ロジック部分だけ切り出して`tests/`配下にテストを書くことを検討してください。
