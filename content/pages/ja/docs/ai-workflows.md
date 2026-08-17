---
title: "AI協業ワークフロー"
description: "Claude Code Skillと雛形スクリプトによるAI協業の型"
pageType: "other"
---

# AI協業ワークフロー

AstroTableは、コードを書かない運用者が生成AI(Claude Code等)への指示だけで運用できることを中核の設計目標としています。よくある作業は`.claude/skills/`のSkillとして型にはめてあります。

## 基本方針

AIが自由記述でコードを生成すると、規約からの逸脱(列の意味づけを勝手に変える、Block配置場所を間違える等)が起きやすくなります。そこでAstroTableでは、リポジトリ直下の`CLAUDE.md`(常に読み込まれる要点集)に加えて、よくある作業をSkillと雛形スクリプトで「型」にはめ、AIには「中身を埋める」部分だけを任せる設計にしています。

## Skill一覧

`.claude/skills/`配下に4つのSkillがあります。

### `add-block` — 新しいBlockの追加

Block名・用途をヒアリングし、`npm run new:block`で雛形を生成、中身を実装します。表示サンプル(`example.md`)も一緒に生成されるので、これを書けば新しいBlockが自動的にBlockライブラリページ(`/ja/block-library`)に載ります。最後にビルド確認とテストを行います。詳細は`.claude/skills/add-block/SKILL.md`を参照してください。

### `translate-page` — ページの多言語展開

多言語対応(i18n)をオプトインしている場合のみ使います。翻訳元ページを指定してもらい、Block記法の構造(行・列・画像パス・リンクURL)は一切変更せず、人間が読むテキスト部分のみを翻訳します。ナビ・フッター・taxonomy辞書への追加が必要かも確認します。詳細は`.claude/skills/translate-page/SKILL.md`を参照してください。

### `add-product` — 商品データの追加

commerceモジュール使用時に使います。商品名・カテゴリ・価格等をヒアリングし、`npm run new:product`で雛形を生成、`npx astro check`でスキーマ不備(価格未設定・必須ロケール抜け等)を検知できることを最終防衛ラインとして案内します。詳細は`.claude/skills/add-product/SKILL.md`を参照してください。

### `add-acdl-event` — ACDLイベントの追加

追加したいイベントが「Blockローカルな操作(パターンB)」か「横断的な状態変化(パターンA)」かを判定し、それぞれの実装方法を案内します。パターンAの場合は「ブリッジモジュールを該当ページで明示的にimportする」という配線を忘れないよう注意喚起し、実ブラウザでのpush確認を最終確認として案内します(この配線を忘れがちな理由は[よくあるハマりどころ](/ja/docs/troubleshooting)を参照)。詳細は`.claude/skills/add-acdl-event/SKILL.md`を参照してください。

## 雛形スクリプト

Skillから呼び出す、決定的な出力を生成するNodeスクリプトです。

```bash
npm run new:block -- <name> [columns]     # src/blocks/<name>/index.astroの雛形を生成
npm run new:product -- <slug>             # content/products/<slug>.yamlの雛形を生成
```

生成される雛形にはコメントで「ここを埋める」「変更してはいけない部分」が明記されています。実装は`scripts/new-block.mjs`、`scripts/new-product.mjs`です。

## 模範Block

`src/blocks/cards/index.astro`はコメントを厚めに書いた模範実装です。新しいBlockを作る際はこれを参考にしてください。

## テストとの関係

AIが生成したコードを、書いた本人(コードを読まない運用者)が正しさを判断できない前提に立つと、テスト([テスト](/ja/docs/testing)参照)が唯一の客観的な正しさの担保になります。各Skillの最終ステップには必ず「対応するテストを書く/実行する」ことが含まれています。
