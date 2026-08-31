---
title: "Adobe Client Data Layer連携"
description: "タグマネージャーへ橋渡しするデータレイヤー(ACDL)の初期化・push設計・page/user名前空間"
pageType: "other"
---

# Adobe Client Data Layer連携

ページの情報やユーザー操作を、いわゆるタグマネージャー(Adobe Launch、GTM等)に橋渡しするためのデータレイヤーとして、[Adobe Client Data Layer](https://github.com/adobe/adobe-client-data-layer)(公式npmパッケージ、以下ACDL)を採用しています。

## 初期化

`src/layouts/Base.astro`の`<head>`内、他のどのスクリプトよりも先に初期化します。

```html
<script is:inline define:vars={{ pageContext }}>
  window.adobeDataLayer = window.adobeDataLayer || [];
  window.adobeDataLayer.push({ page: pageContext });
</script>
<script>
  import '@adobe/adobe-client-data-layer/dist/adobe-client-data-layer.min.js';
</script>
```

`window.adobeDataLayer`を配列として先に初期化し、そこに`page`コンテキストをpushしてから、ACDL本体を読み込みます。ACDL本体は既存の配列を検知して、`push`/`getState`/`addEventListener`を持つ本来のオブジェクトに拡張します(公式推奨の初期化パターンです)。

```js
window.adobeDataLayer.push({
  page: {
    pageName: string,
    pageType: string,   // "top" | "product" | "cart" | ... (frontmatterのpageTypeと同じenum)
    locale: string,      // 多言語対応時のみ
  },
});
```

`page`のpush自体は`event`キーを持たない、単なる状態マージのData Objectです。ページコンテキストの存在をタグマネージャーができるだけ早く検知できるよう、あえてhead最速のタイミングでpushしています。

### Page Load計測イベント(`page loaded`)

[ACDL公式wiki](https://github.com/adobe/adobe-client-data-layer/wiki)記載の`"event": "page loaded"`規約に沿ったEvent Objectは、`body`の一番最後(`MemberOverlay`の後)で別途pushします。

```js
window.adobeDataLayer.push({ event: 'page loaded' });
```

`page`のpush(head最速)とタイミングを分けているのは、`user`(会員データ)・`view_item`等、同ページ内の他のACDLコンテキストが揃うのを待ってから発火させるためです。`page`のpush自体をPage View計測のトリガーにすると、まだ`user`等が揃っていない段階でビーコンが送出されてしまいます。タグマネージャー側でPage View計測をトリガーする際は、`page`のpushではなく`page loaded`イベントを使ってください。

`page loaded`は付随データを持たないため、ACDLの仕様上`adobeDataLayer:change`では拾えません。`adobeDataLayer:event`(またはイベント名そのもの)でリスンする必要があります(`add-to-cart`等、`productListItems`のような付随データを持つイベントは`change`でも拾えます)。

## イベントのpush: 2つのパターン

判断基準は「横断的な状態変化(ページ/カート/会員セッション)か、Blockローカルな操作か」です。

### パターンB: Block直接push(推奨、まずはこちらを検討)

モーダルの開閉・タブ切り替え・アコーディオンのトグルなど、個々のBlock内で完結する操作は、Blockの`<script>`から直接pushします。

```ts
// src/lib/acdl.ts
export function pushEvent(eventName: string, payload: Record<string, unknown> = {}): void {
  window.adobeDataLayer.push({ event: eventName, ...payload });
}
```

```astro
<!-- 例: src/blocks/accordion/index.astro -->
<script>
  import { pushEvent } from '../../lib/acdl';

  document.querySelectorAll('.accordion__item').forEach((item) => {
    item.addEventListener('toggle', () => {
      const label = item.querySelector('.accordion__title')?.textContent ?? '';
      pushEvent('accordion_toggle', { blockName: 'accordion', label, state: item.open ? 'open' : 'closed' });
    });
  });
</script>
```

現時点でこのパターンを使っているBlockは`accordion`(`accordion_toggle`)、`modal`(`modal_toggle`。トリガークリックで`open`、ネイティブの`close`イベントで`closed`。閉じるボタン・背景クリック・ESCキーいずれの経路でも`close`イベントは一律で発火するため、経路ごとに個別のpushEventは不要)、`tabs`(`tabs_switch`。タブ切り替えのたびに発火)です。

イベント名の強制フォーマットはありませんが、`<blockname>_<action>`(例: `accordion_toggle`)を推奨します。新しいBlockを追加するたびに中央側を修正する必要がなく、「ディレクトリを1つ足すだけ」というBlockの設計思想と整合します。

### パターンA: 中央集権ブリッジ(横断的な状態変化)

カート状態の変化、会員のログイン/ログアウト、ページ到達によるライフサイクルイベント(`view_item`/`start-checkout`/`purchase-complete`)など、特定のBlockに閉じない変化は、中央の1箇所にまとめます。commerceモジュールの`acdl-bridge.ts`とmemberモジュールの`acdl-bridge.ts`がいずれもこの実例です。

```
cart.ts (状態管理。ベンダー非依存)
   ↓ window.dispatchEvent(new CustomEvent('cart:change', ...))
acdl-bridge.ts (ACDL特化のマッピング層)
   ↓ window.adobeDataLayer.push({ event: 'add-to-cart', ... })
adobe-client-data-layer
```

状態管理モジュール(`cart.ts`や`member.ts`)自身はACDLの存在を一切知りません。汎用イベント(`cart:change`、`member:login`等)を発火するだけです。ツールを乗り換える場合も、書き換えが必要なのはブリッジ層だけで済みます。

中央集権ブリッジのモジュールは、そのイベントが発生しうる全ページで明示的にimportする必要があります。静的サイトはページ遷移のたびに全JSが読み込み直されるため、共通レイアウトから自動で読み込まれるわけではありません(memberモジュールの`acdl-bridge.ts`は例外的に、`member.enabled`時に全ページへ差し込まれる`MemberOverlay.astro`から読み込まれているため、実質的にどのページでもimport漏れが起きません)。

## ECライフサイクルイベント(commerceモジュール、XDM Commerceイベント設計準拠)

commerceモジュールを使うサイトでは、以下のイベントが発火します。全イベント共通で、**そのECサイト機能に関する計測内容(発生回数・ID・カート情報等)は`commerce`キー配下、そのイベント時点の商品情報は`productListItems`配列(XDM CommerceのProduct List Items形式)** という構成に揃えています。

- `view_item` — PDPページ読み込み時。PDPページの初期化スクリプトが直接push
- `add-to-cart` — カートに追加/数量増加時。`commerce`の`acdl-bridge.ts`がpush
- `remove-from-cart` — カートから削除/数量減少時。`commerce`の`acdl-bridge.ts`がpush
- `start-checkout` — チェックアウトページ(`/commerce/cart/checkout`)読み込み時。同ページの初期化スクリプトが直接push
- `purchase-complete` — 注文完了ページ(`/commerce/order`)読み込み時。同ページの初期化スクリプトが直接push

`view_item`のペイロード例です。

```js
window.adobeDataLayer.push({
  event: 'view_item',
  commerce: {
    productViews: { value: 1, id: string },           // idはイベントごとに一意
  },
  productListItems: [{ SKU, name, quantity: 1, priceTotal, currencyCode, productImageUrl }],
});
```

`add-to-cart`のペイロード例です。

```js
window.adobeDataLayer.push({
  event: 'add-to-cart',
  commerce: {
    productListAdds: { value: 1, id: string },       // idはイベントごとに一意
    cart: { cartID: string, cartSource: 'product_detail' },
  },
  productListItems: [
    { SKU, name, quantity, priceTotal, currencyCode, productImageUrl, productAddMethod: 'add_to_cart_button' },
  ],
});
```

`priceTotal`は単価ではなく**その明細行の合計金額**(単価 × `quantity`)です。`quantity`の意味はイベントごとに異なります。

- `view_item` — 常に1(閲覧イベントなので数量という概念自体がない)
- `add-to-cart`/`remove-from-cart` — 今回追加/削除した数量
- `start-checkout` — その時点のカート内数量(カート内全商品を`productListItems`に含める)
- `purchase-complete` — 注文された数量(注文に含まれる全商品を`productListItems`に含める。単一商品/複数商品どちらの注文でも配列で統一)

`commerce.cart.cartID`はカートの一意識別子(`cart.ts`が`crypto.randomUUID()`で発行し、カートが空になるたび=注文確定時に再発行)です。`cartSource`は`add-to-cart`のみ、追加が起きた場所を表します(PDPからの追加のみサポートしているため常に`product_detail`)。

`purchase-complete`のペイロード例です。

```js
window.adobeDataLayer.push({
  event: 'purchase-complete',
  commerce: {
    purchases: { value: 1, id: `purchase-event-${purchaseId}` },  // 送信イベントの重複排除キー
    order: {
      purchaseID: string,       // 販売側で発行した注文ID(業務キー)。commerce.purchases.idとは別管理
      currencyCode: string,
      priceTotal: number,       // 注文全体の合計(商品明細priceTotalの合計と一致させる)
      payments: [{ paymentAmount: number, paymentType: string, currencyCode: string, transactionID: string }],
    },
    cart: { cartID: string },
  },
  productListItems: [{ SKU, name, quantity, priceTotal, currencyCode }],
});
```

`purchase-complete`は以下のリロード起因の二重送信対策をしています。

1. 注文確定済みページ(`/commerce/order`)でのみ発火する
2. `purchaseID`は`/commerce/confirmation`で注文確定した時点の注文システム発行IDを使う(ページロードのたびに生成し直さない)
3. `sessionStorage`に`purchaseID`ごとの送信済みフラグを残し、同じ`purchaseID`に対しては`order.astro`のリロード・戻る/進む操作で再度pushしない

詳しくは[commerceモジュール](/ja/docs/commerce)を参照してください。

## `user`名前空間(memberモジュール)

member機能(`site.config.ts`の`member.enabled`)を使うサイトでは、ログイン中の会員情報を`user`名前空間としてpushします。担当は`src/modules/member/lib/acdl-bridge.ts`で、`member.ts`が発火する`member:login`/`member:logout`(ベンダー非依存のCustomEvent)を購読し、変換します。

- ログイン時 — `window.adobeDataLayer.push({ user: { id: member.id, ...member.attributes, email: member.email, emailSha256 } })`。`email`は会員登録時に必須のフィールドなので常に含まれ、会員発行ページで設定した属性(`attributes`)もそのまま`user`オブジェクトに展開されます。`emailSha256`は正規化(前後空白除去・小文字化)後のメールアドレスをSHA-256ハッシュ化した16進数文字列で、生のメールアドレスを扱えない連携先向けです
- ログアウト時 — `window.adobeDataLayer.push({ user: null })`

`page`と同様、`event`キーを持たないpushなので「状態」としてマージされ、履歴には残りません。タグマネージャー側からは「現在ログイン中かどうか、ログイン中なら誰か」という状態として参照する使い方を想定しています。

`window.adobeDataLayer`はページ単位(フルページ遷移で消える)なので、`page`コンテキストと同様、ページの読み込み時点で既にログイン中なら`user`状態を再pushします。これが無いと、たとえば会員発行ページのクイックログインから別ページへ遷移した直後に、遷移前のページでpushした`user`情報が新しいページの`adobeDataLayer`に反映されない、という問題が起こります。

`member`モジュールの`acdl-bridge.ts`は、`member.enabled`時に全ページへ差し込まれる`MemberOverlay.astro`から読み込まれています。そのため、ログイン/ログアウトが会員発行ページ・ログインページ・オーバーレイ自身のどこで起きても、確実にACDLへ届きます(中央集権ブリッジのimport漏れが構造的に起きないケースです)。会員機能全体の詳しい説明は[会員機能(ログインダミーシステム)](/ja/docs/member)を参照してください。

## マーケティングタグの注入(タグマネージャー本体等)

Adobe Launch/GTM等のタグ本体は、コードを直接編集せず`site.config.ts`で設定します。`Base.astro`が、ACDL初期化の**後**・他のどのスクリプトより**前**にこの設定を出力するため、タグマネージャーが読み込まれる時点で`window.adobeDataLayer`が必ず存在する状態が保証されます。

## 新しいイベントを追加する

1. パターンA/Bのどちらかを判定する
2. パターンBなら該当Blockの`<script>`に`pushEvent()`を追記、パターンAなら中央のブリッジ層に購読処理を追加(パターンAの場合はimportの配線を忘れないこと)
3. 実際にpushされることをブラウザの開発者ツール等で確認する

## 動作確認方法

Playwrightなどでpushを検証する場合は、ACDL本体の読み込み**前**に「関数push」でリスナー登録を仕込みます(ACDLは`typeof item === 'function'`のpushをFCTNアイテムとして認識し、ライブラリ初期化時にdataLayerインスタンスを引数に実行します)。`window.adobeDataLayer.push`自体を独自関数で上書きする方式は、ライブラリ初期化時にその上書きが失われるため使えません。

```ts
await page.addInitScript(() => {
  window.adobeDataLayer = window.adobeDataLayer || [];
  window.__acdlEvents = [];
  window.adobeDataLayer.push((dataLayer) => {
    dataLayer.addEventListener('adobeDataLayer:change', (event) => {
      window.__acdlEvents.push(event);
    });
  });
});
```

## 将来の拡張

CMPの同意状態は、`consent`といった新しい名前空間を追加でpushするだけで対応できる設計になっています(既存の`page`/`user`/イベント構造の変更は不要)。現時点ではこのスキーマは未設計です。
