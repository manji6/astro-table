---
title: "会員機能(ログインダミーシステム)"
description: "会員発行・ログイン・ログイン状態オーバーレイ・マイページ・お気に入りを提供するオプトインの会員モジュール"
pageType: "other"
---

# 会員機能(ログインダミーシステム)

`member`モジュールは、会員ID・属性の管理、ログイン/ログアウト、ログイン中かどうかを示すオーバーレイ表示を提供するオプトインの機能です。実際の認証(パスワード照合やセッショントークンの発行)は一切行わない、**検証用のログインダミーシステム**です。会員IDさえ発行してあれば誰でもそのIDでログインでき、パスワードという概念自体がありません。

マーケティングツール検証(会員ログイン後のパーソナライゼーション、ACDLの`user`名前空間との連携など)を目的とした機能で、実運用の認証基盤としては使えません。

## On/Offの切り替え

`site.config.ts`の`member.enabled`で機能全体をOn/Offできます。

```ts
const siteConfig: SiteConfig = {
  member: {
    enabled: true, // false にすると会員関連ページはビルドされない
  },
};
```

`enabled: false`の場合、`/member`・`/login`・`/commerce/member`・`/commerce/member/favorites`はそれぞれの`getStaticPaths()`が空配列を返し、ビルド自体でページが生成されません(Astroの静的サイト生成に対する自然なOn/Off手段です)。ログイン状態オーバーレイも、`enabled: true`のときだけ全ページ共通レイアウト(`Base.astro`)から差し込まれます。

## `src/modules/member/`の構成

```
src/modules/member/
  lib/
    member.ts        # 会員データ・セッション管理(localStorage)
    acdl-bridge.ts    # member:login/member:logout → ACDL user名前空間への変換
  components/
    MemberOverlay.astro  # ログイン状態オーバーレイ(全ページ共通レイアウト)
```

commerceモジュールとは完全に独立しており、memberモジュール自身はcommerceに一切依存しません(唯一の依存関係は逆方向で、commerceのお気に入り機能がmemberの`getCurrentMemberId()`を参照します)。

## 会員データ・セッション管理(`member.ts`)

`src/modules/member/lib/member.ts`が`localStorage`ベースで会員の名簿(roster)とログインセッションを管理します。cartのlocalStorageパターン(素朴なTS関数 + CustomEvent + `storage`イベントでのクロスタブ同期)を踏襲しています。

```ts
type Member = {
  id: string;
  attributes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

listMembers(): Member[]
getMember(id: string): Member | undefined
saveMember(id: string, attributes: Record<string, string>): Member  // 既存IDなら更新、新規なら作成
deleteMember(id: string): void

getCurrentMemberId(): string | null
getCurrentMember(): Member | null
login(id: string): Member | null   // 未発行のIDはnullを返す
logout(): void

exportMembers(): string             // 名簿をJSON文字列として書き出す
importMembers(json: string): Member[]  // JSON文字列から名簿を一括インポート
```

会員は「ID」と自由な「属性(key-value)」だけを持つ、シンプルなレコードです。属性の内容に制約はなく、パーソナライゼーション検証用の任意項目(会員ランク、居住地域など)を自由に設定できます。

操作のたびに`member:change` / `member:login` / `member:logout`のいずれかの`CustomEvent`が`window`に発火します。他タブでの変更は`storage`イベント経由で検知し、同じイベントとして再発火されるため、複数タブを開いた状態でもログイン状態が同期します。

## 会員発行ページ(`/member`)

任意の会員IDと属性を作成・更新できるページです。実運用でいう「管理画面での会員登録」に相当する検証用UIで、認証は伴いません。

- 会員IDと、複数の属性(キーと値のペア)を入力してフォームから保存
- 発行済み会員の一覧表示、編集、削除
- 一覧の各行から直接ログインできる「ログインする」ボタン(押すと`/login`へ遷移し、ログイン済みの状態になっている)
- 名簿全体をJSONとしてエクスポート/インポート(検証環境の再現や共有に利用)

## ログインページ(`/login`)

会員IDを入力してログイン状態にするページです。事前に会員発行ページで発行済みのID以外を入力するとエラーになります。ログイン中はログアウトボタンとログイン中の会員IDを表示します。

## ログイン状態オーバーレイ(`MemberOverlay.astro`)

全ページ共通で画面右下に固定表示される、現在のログイン状態を示すオーバーレイです。`member.enabled`がtrueのとき、`Base.astro`から条件付きで差し込まれます。BlockではなくBreadcrumbsやLanguageSwitcherと同じ「レイアウトコンポーネント」という位置づけです。

- ログイン中: ログイン中の会員IDとログアウトボタンを表示
- 未ログイン: 発行済み会員からのクイックスイッチ用セレクトボックスとログインボタン、ログインページへのリンクを表示

クイックスイッチは、ページを離れずにその場で別の会員IDへログインし直せる開発・検証向けの機能です。発行済み会員が1人もいない場合はセレクトボックスが無効化されます。

## マイページ(`/commerce/member`)とお気に入り

ログイン中会員向けのハブページです。`commerce`モジュール側の実装ですが、`member.enabled`時のみ生成されるページで、ログインしていなければログインページへの導線が表示されます。現状のリンクは`/commerce/member/favorites`(お気に入り一覧)のみです。

お気に入り自体は`commerce`モジュールの機能ですが、ログイン中の会員に紐づく機能のため、`member`モジュールの`getCurrentMemberId()`に依存しています。詳しくは[commerceモジュール](/ja/docs/commerce)を参照してください。

## ACDLとの連携(`user`名前空間)

`src/modules/member/lib/acdl-bridge.ts`が`member:login`/`member:logout`イベントを購読し、Adobe Client Data Layer(ACDL)の`user`名前空間へのpushに変換します。`member.ts`自身はACDLの存在を一切知りません(commerceモジュールの`cart.ts`→`acdl-bridge.ts`と同じ中央集権ブリッジのパターンです)。

```ts
// ログイン時
window.adobeDataLayer.push({ user: { id: member.id, ...member.attributes } });

// ログアウト時
window.adobeDataLayer.push({ user: null });
```

会員の属性(`attributes`)はそのまま`user`オブジェクトへ展開されます。会員発行ページで自由に設定した属性(会員ランクなど)を、そのままACDL経由でタグマネージャー側のパーソナライゼーション条件に使う、という検証がそのまま行えます。

この`acdl-bridge.ts`は`MemberOverlay.astro`の`<script>`から読み込まれています。オーバーレイ自体が`member.enabled`時に全ページへ差し込まれるコンポーネントなので、ログイン/ログアウトが会員発行ページ・ログインページ・オーバーレイ自身のどこで起きても、確実にACDLへ届きます。

また、`window.adobeDataLayer`はページ単位(フルページ遷移で内容が消える)なので、ページ読み込み時点で既にログイン中であれば、その場で`user`状態を再pushします。これが無いと、たとえば会員発行ページのクイックログインから`/login`へ遷移した直後のページで、遷移前にpushした`user`情報が新しいページの`adobeDataLayer`に反映されない、という問題が起こります。

ACDL全体の設計(初期化順序、パターンA/Bの使い分けなど)は[Adobe Client Data Layer連携](/ja/docs/analytics-acdl)を参照してください。
