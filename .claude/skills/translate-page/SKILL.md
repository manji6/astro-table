---
name: translate-page
description: 既存ページを別ロケールへ翻訳展開する(多言語対応オプトイン時のみ)。「このページを英語版も作って」「〜を翻訳して」等で使う。
---

# translate-page: ページの多言語展開

参照: `/ja/docs/i18n`、`/ja/docs/ai-workflows`

**前提確認**: このプロジェクトが多言語対応(i18n)をオプトインしているか(`astro.config.mjs`に`i18n`設定があるか)を最初に確認する。オプトインしていない場合はこのSkillを使わない旨を伝え、作業を中断する。

## 手順

1. **翻訳元ページの指定**: 対象ページ(例: `content/pages/ja/summer-campaign.md`)を確認する。

2. **翻訳**:
   - Block記法の構造(表の行・列、画像パス、リンクURL)は**一切変更しない**。
   - 人間が読むテキスト部分(見出し・本文・ボタン文言・alt属性等)のみを翻訳する。
   - 出力先は対応ロケールのファイル(例: `content/pages/en/summer-campaign.md`)。frontmatterの`title`/`description`も翻訳する。
   - リンク先パス(`/ja/...`等のロケールプレフィックス)がある場合は、翻訳先ロケールのプレフィックスに正しく置き換える。

3. **関連ファイルの確認**: 以下に翻訳先ロケール向けの追加が必要な項目がないか確認し、あれば案内する。
   - ナビゲーション: `content/nav/<locale>.md`
   - フッター: `content/footer/<locale>.md`
   - カテゴリ表示名辞書(commerceモジュール使用時): `content/taxonomy/categories-<locale>.yaml`

4. **ビルド確認**: `npm run build`で翻訳先ページが正しいURL(`/<locale>/...`)で生成されることを確認する。

5. **テスト**: 言語切り替えUI(`LanguageSwitcher`)経由でも到達できることを確認する(既存のE2E `e2e/sample-blocks.spec.ts`の「language switcher」テストが参考になる)。

## 注意

- 翻訳の同期(元ページが更新された時に翻訳ページも追従させるか)は運用上の課題として割り切っており、自動化の仕組みは無い。
- カテゴリキーのような「商品を横断する分類キー」自体(例: `shoes`)は翻訳しない(表示名だけをtaxonomy辞書側で翻訳する)。
