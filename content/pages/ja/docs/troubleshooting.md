---
title: "よくあるハマりどころ"
description: "開発中に実際に踏んだ落とし穴と対処法"
pageType: "other"
---

# よくあるハマりどころ

開発中に実際に踏んだ落とし穴をまとめています。カスタマイズする際に同じ問題に当たったら、まずここを確認してください。

## 表がBlockとして認識されない

GFM仕様では、ヘッダー行とデリミタ行(2行目の`---`の行)のセル数が一致しない表は、**表として認識されません**(ただのプレーンテキストとして扱われる)。ヘッダー行は本文の列数に合わせて空セルで埋めてください。

```markdown
<!-- NG: 3列のつもりでもヘッダーが1セルしかない → 表として認識されない -->
| cards |
| --- | --- | --- |
| a | b | c |

<!-- OK: ヘッダーを空セルで埋める -->
| cards | | |
| --- | --- | --- |
| a | b | c |
```

## クライアントJSで挿入した要素にBlock/ページのCSSが効かない

Astroのスコープドスタイル(`<style>`)は、ビルド時に静的に存在するDOM要素にのみ`data-astro-cid-*`属性を付与する仕組みです。`innerHTML`でクライアントJSが動的に挿入した要素(検索結果一覧、カート内商品一覧など)には、この属性が付与されないため、通常の`<style>`は**一切効きません**。

```astro
<!-- NG: 動的に挿入される .cart-page__items li には効かない -->
<style>
  .cart-page__items li { display: flex; }
</style>

<!-- OK: is:global にする -->
<style is:global>
  .cart-page__items li { display: flex; }
</style>
```

見た目が変わらない/意図したCSSが当たらないページがあれば、まずそのページが`innerHTML`でDOMを組み立てていないか確認してください。

## Adobe Client Data Layerへのイベントが実ブラウザでpushされない

サイト横断的な状態変化を扱う中央集権ブリッジモジュール(`acdl-bridge.ts`等)は、**そのイベントが発生しうる全ページで明示的にimportする必要があります**。静的サイトはページ遷移のたびに全JSが読み込み直されるため、共通レイアウトから自動で読み込まれるわけではありません。

この配線を忘れると、ユニットテストは通る(モジュールを直接importして呼び出す形でテストしているため)のに、実際のブラウザでは一切pushされない、という気づきにくい不具合になります。新しい中央集権ブリッジを追加・利用するページを作ったら、必ず実ブラウザ(手動確認またはE2E)でpushされることを確認してください。

## ACDLの`push`を直接上書きしてもイベントを捕捉できない

E2Eテスト等で`window.adobeDataLayer.push`を独自関数に差し替えても、ACDL本体がライブラリ初期化時にその`push`メソッドを自分の実装で置き換えてしまうため、途中から捕捉できなくなります。ACDLが公式にサポートする「関数push」のidiomを使ってください。

```ts
await page.addInitScript(() => {
  window.adobeDataLayer = window.adobeDataLayer || [];
  window.adobeDataLayer.push((dataLayer) => {
    dataLayer.addEventListener('adobeDataLayer:change', (event) => {
      // ここでイベントを捕捉する
    });
  });
});
```

## 内部リンクが404になる(多言語対応時)

多言語対応(i18n)をオプトインしている場合、ページ内のリンク・画像パスには**ロケールプレフィックスを自分で書く必要があります**。Block(cards等)が現在のページのロケールを自動検知してリンクを補完する仕組みはありません。

```markdown
<!-- content/pages/ja/about.md では -->
[トップに戻る](/ja/)

<!-- content/pages/en/about.md では -->
[Back to top](/en/)
```

これは意図的な設計判断です(Blockが`{name, variants, rows}`のみを受け取るという基本契約を維持するため)。ページを追加・翻訳する際は、リンク先のロケールプレフィックスが正しいか必ず確認してください。

## Content Collectionsのファイル名にドットを2つ使うと、意図しないIDになる

`categories.ja.yaml`のように、拡張子以外にもう1つドットを含むファイル名にすると、Content CollectionsのglobローダーはIDを生成する際にドットを全て除去し、`categoriesja`という予期しないIDになります(`categories.ja`にはなりません)。ロケール別のファイル名は`categories-ja.yaml`のようにハイフンで区切ってください。

## `getStaticPaths()`内で外部スコープの定数が`is not defined`になる

```astro
---
const ROUTE_LOCALES = ['ja', 'en'];

export async function getStaticPaths() {
  return ROUTE_LOCALES.map((locale) => ({ params: { locale } })); // ビルド時に "ROUTE_LOCALES is not defined"
}
---
```

Astroのビルドプロセスが`getStaticPaths()`を分離した実行コンテキストで扱うことがあり、`getStaticPaths()`の外で宣言しそこでしか使っていない定数を正しく捕捉できないことがあります。配列リテラルは`getStaticPaths()`の中に直接書いてください。

```astro
---
export async function getStaticPaths() {
  return ['ja', 'en'].map((locale) => ({ params: { locale } })); // OK
}
---
```

## `npm ci`がCIで失敗する

`npm ci`は`package-lock.json`と`package.json`の厳密な一致を要求しますが、rolldown(Viteのバンドラー)のwasm32-wasi向けoptionalDependencies(`@emnapi/*`)まわりで、ローカルとCIの環境差からロックファイルの整合性チェックが誤検知することがありました。このリポジトリのCIは`npm ci`ではなく`npm install`を使っています。再現性の厳密さはやや劣りますが、依存関係を頻繁に追加/削除する開発初期にはこちらの方が実用的です。

## ヘッダー/フッター/パンくずの左右位置がズレる(paddingの二重適用)

`global.css`は`.site-header-row`・`.site-footer`・`.breadcrumbs`・`main`に共通の横方向padding(`padding-inline`)を定義し、これでページ全体の左右位置を揃えています。header/footer Blockの実装(`src/blocks/header/index.astro`等)が**自分自身にも**横方向のpaddingを持ってしまうと、共通コンテナのpaddingと二重にかかり、その要素だけ左右にズレて見えます。

```css
/* NG: .site-headerが独自に横paddingを持つと、外側の.site-header-rowのpaddingと二重にかかる */
.site-header {
  padding: 1rem 1.5rem;
}

/* OK: 横方向は共通コンテナ(global.css)に任せ、縦方向のみ指定する */
.site-header {
  padding-block: 1rem;
}
```

独自のヘッダー/フッター/ページ直下要素を作る際は、横方向の余白を共通コンテナ側(`global.css`)だけが持つように統一してください。この種のズレはビルドやテストでは検知できず、実際にブラウザで見て初めて気づけます。

## `hidden`属性でJSから要素を隠したのに消えない

`hidden`属性はUAスタイルシートの`display: none`で効きますが、その要素自身(祖先ではなく)に`display: flex`/`display: grid`等を指定するCSSルールがあると、著者スタイルがUA既定を上書きしてしまい、`element.hidden = true`にしても見た目上消えません(HTML属性としては`hidden=""`が付いているのに、実際には表示され続けます)。`<form>`のように`global.css`側で汎用的に`display`を当てているタグや、コンポーネント自身が`display: flex`でレイアウトしている要素(カード/バッジ等)を`hidden`で出し分けるときは特に注意してください。

```css
/* NG: [hidden]でも.login-page__formにはdisplay: flexが勝ってしまい消えない */
form {
  display: flex;
}

/* OK: [hidden]の場合だけ明示的に上書きし直す */
.login-page__form[hidden] {
  display: none;
}
```

この種のバグはビルドやユニットテストでは検知できず、実ブラウザ(またはPlaywrightの`toBeHidden()`)で初めて気づけます。`hidden`属性で表示切り替えを行うクラスには、原則としてこの上書きルールをセットで書いてください。

## Vitestで`localStorage`が壊れている(`.clear is not a function`等)

Vitestの`environment: 'happy-dom'`という文字列指定は、専用のアダプターパッケージ(`vitest-environment-happy-dom`)が別途必要です。このパッケージが利用できない場合、`environment`の指定は静かに無視され、`localStorage`等のDOM APIが壊れたオブジェクトになります。このリポジトリでは`environment: 'node'` + `tests/setup.ts`で`@happy-dom/global-registrator`の`GlobalRegistrator.register()`を呼ぶ方式に切り替えています(詳細は[テスト](/ja/docs/testing)を参照)。
