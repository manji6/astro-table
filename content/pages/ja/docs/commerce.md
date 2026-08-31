---
title: "commerceモジュール(EC機能)"
description: "商品データ・PDP・カート・チェックアウト・検索・カテゴリを提供するオプトインのECモジュール"
pageType: "other"
---

# commerceモジュール(EC機能)

商品ページ・カテゴリ一覧・キーワード検索・カート・チェックアウトを提供する、オプトインのECモジュールです。取り外し可能な設計になっており、EC機能が不要なサイトでは`src/modules/commerce/`と`src/pages/[locale]/commerce/`一式を丸ごと削除できます。

commerceモジュールは多言語対応(i18n)がオプトインされている前提の実装です。

## ディレクトリ構成

```
src/modules/commerce/
  blocks/
    buy-box/            # カート追加ボタン(PDP用)
    product-gallery/     # 商品画像ギャラリー(PDP用)
    related-products/    # 関連商品(cards Blockを内部で再利用)
  lib/
    cart.ts              # カート状態管理(localStorage)
    favorites.ts          # お気に入り状態管理(localStorage、会員限定)
    favorite-button.ts    # お気に入りボタンの共通UIロジック
    acdl-bridge.ts        # cart:change → ACDL変換
    locale.ts             # ルートロケール↔商品ロケールの対応表
content/
  products/*.yaml         # 商品データ(1商品1ファイル)
  taxonomy/categories-<locale>.yaml  # カテゴリキー→表示名
src/pages/[locale]/commerce/
  index.astro
  detail/[slug].astro
  products-index.json.ts  # 検索用JSONインデックス
  category/index.astro
  category/[category].astro
  search.astro
  cart/index.astro
  cart/checkout/index.astro
  confirmation.astro
  order.astro
  member/index.astro      # マイページ(member.enabled時のみ)
  member/favorites.astro  # お気に入り一覧(member.enabled時のみ)
```

## 商品データ

1商品 = 1ファイル(YAML)。`content/products/<slug>.yaml`に配置します。

```yaml
sku: WKDY-SHU-001
images:
  - /images/products/commute-running-shoes.png
categories: [shoes]
tags: [running, commute]
stock: in_stock
prices:
  ja-JP: { currency: JPY, amount: 18000 }
  en-US: { currency: USD, amount: 129.99 }
translations:
  ja-JP: { title: "コミュートランニングシューズ", description: "通勤ラン需要に応える軽量設計の..." }
  en-US: { title: "Commute Running Shoes", description: "Lightweight shoes built for the run-commute..." }
```

スキーマ(`src/content.config.ts`の`products`コレクション)の主なフィールドは次の通りです。

- `sku`(string) — 商品コード。ロケール非依存
- `images`(string配列、最低1件) — 画像パスの配列
- `categories`(string配列、最低1件) — カテゴリキー(taxonomy辞書のキーと対応)
- `tags`(string配列、既定`[]`) — 検索用キーワード
- `stock`(`in_stock` | `out_of_stock`、既定`in_stock`) — 在庫状態
- `prices`(`{ [locale]: { currency, amount } }`) — ロケール別価格。キーは`ja-JP`/`en-US`
- `translations`(`{ [locale]: { title, description? } }`) — ロケール別商品名・説明文

SKU・画像・カテゴリキー・在庫状態はロケール非依存です。価格と表示文言だけがロケール別に持たれます(1商品1ファイルの原則を保つため)。

`npm run new:product -- <slug>`で商品データの雛形を生成できます。

## カテゴリ表示名

`content/taxonomy/categories-<locale>.yaml`にカテゴリキー→表示名の対訳を定義します。

```yaml
# categories-ja.yaml
wear: ウェア
shoes: シューズ
bags: バッグ
accessories: アクセサリー
```

## ページ一覧

- `/<locale>/commerce` — コマーストップ。検索・カテゴリ・カートへの導線
- `/<locale>/commerce/detail/[slug]` — PDP(商品詳細)。固定Astroテンプレート
- `/<locale>/commerce/category` — カテゴリTOP。全カテゴリの一覧
- `/<locale>/commerce/category/[category]` — カテゴリ別一覧。`cards` Blockを再利用して表示
- `/<locale>/commerce/campaign` — キャンペーンTOP・個別キャンペーン。`content/pages/`配下のBlock記法ページ(固定テンプレートではなく、このCMSの通常ページとして書かれている)
- `/<locale>/commerce/search` — キーワード検索。静的1ページ+クライアントJS
- `/<locale>/commerce/products-index.json` — 検索用の軽量JSONインデックス(APIエンドポイント)
- `/<locale>/commerce/cart` — カート内容の一覧・数量変更・削除
- `/<locale>/commerce/cart/checkout` — ダミーのチェックアウトフォーム(実際の決済処理はしない)
- `/<locale>/commerce/confirmation` — 注文確認。「注文を確定する」を押すまで注文は確定しない
- `/<locale>/commerce/order` — 注文完了(サンクス)ページ
- `/<locale>/commerce/member` — マイページ(ハブ)。ログイン中会員向けの導線をまとめる。`site.config.ts`の`member.enabled`がtrueの場合のみ生成される
- `/<locale>/commerce/member/favorites` — お気に入り一覧・削除。同じく`member.enabled`時のみ生成

マイページ・お気に入り一覧はcommerceモジュールが提供しますが、会員機能そのもの(ログイン・会員発行)は独立した`member`モジュールの役割です。詳しくは[会員機能(ログインダミーシステム)](/ja/docs/member)を参照してください。

PDPは`getStaticPaths()`でロケール×商品の直積を生成します。

```ts
export async function getStaticPaths() {
  const products = await getCollection('products');
  return ['ja', 'en'].flatMap((locale) =>
    products.map((product) => ({ params: { locale, slug: product.id }, props: { product } })),
  );
}
```

## カート(`cart.ts`)

`src/modules/commerce/lib/cart.ts`が`localStorage`ベースのカート状態を管理します。マーケティングツールには一切依存しません(ACDL連携は別レイヤーで行います)。

```ts
type CartItem = {
  slug: string; title: string; price: number; currency: 'JPY' | 'USD';
  image: string; quantity: number; sku: string; categories: string[];
};

getCart(locale: string): Cart
addItem(locale: string, item: Omit<CartItem, 'quantity'>, quantity?: number): Cart
updateQuantity(locale: string, slug: string, quantity: number): Cart  // 0以下で削除
removeItem(locale: string, slug: string): Cart
clearCart(locale: string): Cart
```

- `locale`引数は商品ロケール表記(`ja-JP`/`en-US`)。localStorageキーは`astro-table:cart:<locale>`で、ロケールごとに独立したカートになります(通貨が混在しないようにするため)
- 操作のたびに`window.dispatchEvent(new CustomEvent('cart:change', { detail }))`を発火します。`detail.action`は`add` / `update` / `remove` / `clear` / `sync`のいずれかです
- 複数タブを開いて操作するケースに対応するため、他タブでの変更は`storage`イベント経由で検知し、`action: 'sync'`として再発火します

購読側の実装例です(`cart/index.astro`と同じ考え方)。

```ts
window.addEventListener('cart:change', (event) => {
  if (event.detail.locale === cartLocale) render();
});
```

## ACDL連携(中央集権ブリッジ)

`src/modules/commerce/lib/acdl-bridge.ts`が`cart:change`イベントを購読し、Adobe Client Data Layer(ACDL)へのpushに変換します。`cart.ts`自身はACDLの存在を知りません。

```
cart.ts (状態管理、ベンダー非依存)
   ↓ window.dispatchEvent('cart:change', ...)
acdl-bridge.ts (ACDL特化の変換層)
   ↓ window.adobeDataLayer.push({ event: 'add-to-cart', ... })
adobe-client-data-layer
```

`add`→`add-to-cart`、`remove`→`remove-from-cart`、`update`は変更前後の数量差分(delta)を見て`add-to-cart`/`remove-from-cart`のどちらかにマッピングします。`clear`/`sync`はpushしません。ペイロード(`productListItems`配列、`commerce.cart.cartID`等)の詳細は[Adobe Client Data Layer連携](/ja/docs/analytics-acdl)を参照してください。

`acdl-bridge.ts`はどこからも自動では読み込まれません。カート変更が起こりうるページ(現状`commerce/detail/[slug].astro`と`commerce/cart/index.astro`)で明示的に`import`する必要があります。新しくカート操作を追加するページを作る場合は、このimportを忘れないでください。ACDL全体の設計は[Adobe Client Data Layer連携](/ja/docs/analytics-acdl)を参照してください。

## buy-box Block

PDPの「カートに入れる」ボタンです。`cart.ts`の`addItem()`を呼び、成功時にボタンの見た目の変化と「カートに追加しました」というフィードバックメッセージ(`aria-live="polite"`)を数秒間表示します。ロケールに応じた価格表示は`Intl.NumberFormat`で行います。

## お気に入り(`favorites.ts`)

会員限定機能です。`src/modules/commerce/lib/favorites.ts`が`member`モジュールの`getCurrentMemberId()`を参照します(commerce→memberの片方向依存。commerceモジュール内で唯一memberモジュールに依存する箇所です)。未ログイン時は`addFavorite`/`removeFavorite`が`null`を返し、操作を拒否します。

```ts
getFavorites(memberId: string): string[]
isFavorite(memberId: string, slug: string): boolean
addFavorite(slug: string): string[] | null   // 未ログイン時はnull
removeFavorite(slug: string): string[] | null
```

`favorite-button.ts`が「ログイン時のみ表示・クリックでトグル」というUI共通ロジックを提供し、PDP(`commerce/detail/[slug].astro`)で使用しています。一覧・削除は`commerce/member/favorites.astro`が担当し、`commerce/member/index.astro`(マイページ)配下のページとして位置づけられています。

会員機能(`member.enabled`)がOffのサイトでは、`commerce/member`配下のページ自体が生成されず、お気に入り機能も実質的に使えません。

## commerceモジュールを削除する

EC機能が不要なサイトを作る場合は、以下を削除してください。

1. `src/modules/commerce/`を削除
2. `src/pages/[locale]/commerce/`一式を削除
3. `content/products/`、`content/taxonomy/`を削除し、`src/content.config.ts`から`products`/`taxonomy`コレクションの登録を削除
4. `nav/<locale>.md`からカート・検索・カテゴリへの導線を削除

`@adobe/adobe-client-data-layer`本体やACDLの`page`名前空間の初期化はEC非依存のコア機能として残ります。
