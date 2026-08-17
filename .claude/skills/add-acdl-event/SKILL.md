---
name: add-acdl-event
description: Adobe Client Data Layer(ACDL)へ新しいイベント計測を追加する。「このボタンのクリックを計測したい」「〜のイベントをACDLに送りたい」等で使う。
---

# add-acdl-event: ACDLイベントの追加

参照: `/ja/docs/analytics-acdl`、`/ja/docs/ai-workflows`

## 手順

1. **判定**: 追加したいイベントが次のどちらかを確認する。
   - **パターンB(Blockローカルな操作)**: モーダルの開閉、アコーディオンのトグル、カルーセルのスクロール等、特定のBlock内で完結する操作
   - **パターンA(横断的な状態変化)**: カート状態の変化やページ到達等、特定のBlockの実装に閉じないサイト横断的な変化

2a. **パターンBの場合**:
   - 該当Blockの`<script>`内で`src/lib/acdl.ts`の`pushEvent(eventName, payload)`を呼ぶ処理を追記する。
   - イベント名は`<blockname>_<action>`(例: `accordion_toggle`)を推奨する(強制ではない)。
   - 参考実装: `src/blocks/accordion/index.astro`

2b. **パターンAの場合**:
   - `src/modules/commerce/lib/acdl-bridge.ts`(commerceモジュール使用時)に購読処理を追加する、または新しい中央集権ブリッジが必要なら同様の設計で新設する。
   - **重要**: ブリッジのモジュール(`acdl-bridge.ts`等)は、そのイベントが発生しうる全ページで明示的に`import`する必要がある(静的サイトはページ遷移のたびに全JSが再読み込みされるため)。共通レイアウト`Base.astro`から読み込むと、EC非依存サイトでも不要な依存が生まれるので避ける。**この配線を忘れると、ユニットテストは通るのに実際のブラウザでは一切pushされない、という検知しにくい不具合になる。**

3. **テスト**:
   - パターンBはユニットテスト(該当Blockのロジックをテストできる範囲で)、パターンAは`src/modules/commerce/lib/acdl-bridge.ts`相当のユニットテストを追加・更新する。
   - 最終確認として、`/ja/docs/testing`に載っているE2E手法(Playwrightの`page.addInitScript`で「関数push」によるリスナー登録 → `window.adobeDataLayer`の変更を捕捉)を使い、**実ブラウザで実際にpushされること**を確認する。ユニットテストだけでは「モジュールが実際にどこかから読み込まれているか」までは検証できない。

## 注意

- CMPの同意状態やパーソナライゼーション用のユーザー属性は、`user`/`consent`等の新しい名前空間を追加でpushするだけでよい設計になっている。既存の`page`/イベント構造は変更しない。
