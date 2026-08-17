---
title: "テスト"
description: "Unit test(Vitest)とE2E test(Playwright)の書き方・実行方法"
pageType: "other"
---

# テスト

AstroTableのテストは大きく4種類に分かれています。

## テストレイヤー

- **Unit** — パース層(`parse-page.ts`)、カートロジック(`cart.ts`)、ACDLブリッジ(`acdl-bridge.ts`)などのロジックを[Vitest](https://vitest.dev/)で検証します。
- **型チェック** — プロジェクト全体を`astro check`で検証します。
- **Lint** — プロジェクト全体をESLintで検証します。
- **E2E** — ゴールデンパス(実ブラウザでの一連の操作)を[Playwright](https://playwright.dev/)で検証します。

Astroコンポーネント(Block)自体の単体テストはスコープ外です。Blockの見た目・挙動はE2Eでカバーし、必要性が出た時点で追加を検討する方針です。

## Unit test(Vitest)

設定は`vitest.config.ts`です。`localStorage`などDOM APIを使うテストのために、`environment: 'node'` + `tests/setup.ts`で`@happy-dom/global-registrator`を使い、グローバルにDOM環境を登録しています。

```ts
// tests/setup.ts
import { GlobalRegistrator } from '@happy-dom/global-registrator';
GlobalRegistrator.register({ url: 'http://localhost:4321/' });
```

テストファイルは`tests/**/*.test.ts`に置きます。`cart.ts`のテスト例です。

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { addItem, getCart } from '../src/modules/commerce/lib/cart';

beforeEach(() => {
  localStorage.clear();
});

describe('cart.ts', () => {
  it('addItem adds a new item', () => {
    const cart = addItem('ja-JP', { slug: 'shoes', title: 'Shoes', price: 1000, currency: 'JPY', image: '', sku: 'S1', categories: [] }, 1);
    expect(cart.items).toHaveLength(1);
  });
});
```

実行方法は次のとおりです。

```bash
npm run test        # 1回実行
npm run test:watch  # ウォッチモード
```

中でも`parse-page.ts`のテストが最も重要です。全ページのビルドが依存する基盤ロジックであり、ここが壊れると気づきにくい形でサイト全体が壊れます。カバーすべきケースは次のとおりです。

- 複数行・複数列のlist系Block
- 2列key-valueのconfig系Block
- 通常コンテンツとBlockの混在
- Block名の正規化・variant記法
- Cellの`text`/`images`/`links`抽出
- 不正な表記(ヘッダー行が空、列数が行によって異なる等)のフォールバック挙動

実例は`tests/parse-page.test.ts`を参照してください。

## E2E test(Playwright)

設定は`playwright.config.ts`です。`webServer`は`npm run preview`を起動するため、テスト実行前に`npm run build`を済ませておく必要があります。

```bash
npm run build
npm run e2e
```

`playwright.config.ts`の`webServer.reuseExistingServer`はCI以外では`true`になっています。そのため、**別のターミナルで`npm run dev`(port 4321)を起動したままE2Eを実行すると、意図せずそちらのdevサーバーに接続してしまいます**(devサーバーは別ブランチ・別の状態かもしれません)。`npm run dev`を起動中に検証したい場合は、一時的に別portの設定(`webServer.command`/`url`/`use.baseURL`を上書き)で実行してください。

初期スコープはゴールデンパスのみです。

```
TOP表示 → カテゴリ一覧 or キーワード検索 → PDP表示 → カートに追加
  → /cart(数量確認) → /checkout(フォーム入力) → /checkout/complete(注文完了)
```

多言語対応をオプトインしている場合はja/en両ロケールで実施します。各ステップで、画面表示内容とAdobe Client Data Layerへのpush(`window.adobeDataLayer`)の両方を検証します。

実例: `e2e/commerce-golden-path.spec.ts`、`e2e/sample-blocks.spec.ts`、`e2e/poc-demo.spec.ts`。

### 画像が実際に読み込めているかの確認

`src`属性の値が正しいだけでは、実際にファイルが存在する(404でない)ことは保証されません。重要な画像は`naturalWidth`もあわせて確認してください。

```ts
const image = page.locator('img').first();
await expect(image).toHaveJSProperty('complete', true);
const naturalWidth = await image.evaluate((el: HTMLImageElement) => el.naturalWidth);
expect(naturalWidth).toBeGreaterThan(0);
```

## テストファースト運用

新しいBlock・ページ・機能を追加する際は、以下の順序を基本とします。

1. 満たすべき挙動を成功基準として言語化する(例:「カートに商品を1つ追加すると`cart:change`が発火する」)
2. 対応するテストを先に書き、失敗することを確認する
3. 実装し、テストを通す
4. 既存のE2Eゴールデンパスを壊していないことを確認する

## CI

CI(GitHub Actions)は、PR作成時・mainへのpush時に以下を順に実行します。

```
install → lint → typecheck(astro check) → unit test → build → Playwright install → e2e test
```

インストールステップは`npm ci`ではなく`npm install`を使っています。理由は[トラブルシューティング](/ja/docs/troubleshooting)を参照してください。デプロイとは独立して実行されます。
