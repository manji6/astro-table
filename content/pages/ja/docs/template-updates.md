---
title: "テンプレート更新の取り込み"
description: "リリースタグを使ってAstroTableの更新をサイトに取り込む手順"
pageType: "other"
---

# テンプレート更新の取り込み

「Use this template」で作成したサイトはAstroTable本体とは別の履歴を持ちます。本体の更新は[GitHub Releases](https://github.com/manji6/astro-table/releases)で内容を確認し、タグを指定してサイト側の作業ブランチに取り込みます。

## バージョンとリリースノート

最初のリリースは `v0.1.0` です。以降は `vMAJOR.MINOR.PATCH` のSemVer形式を使います。0.xの間は破壊的な変更をマイナー更新（例: 0.1 → 0.2）にまとめ、互換性のある修正はパッチ更新（例: 0.1.0 → 0.1.1）にします。1.0以降の破壊的な変更はメジャー更新です。

各リリースノートに、変更内容、破壊的な変更、移行手順、サイト側で確認するファイルを記載します。公開済みタグは付け替えません。取り込み前に対象リリースまでのノートを読み、`Base.astro`、`site.config.ts`、依存関係、削除したモジュールへの影響を確認してください。

## 準備（サイト側リポジトリで実行）

変更をコミットして作業ツリーをきれいにしてから、更新用ブランチを作ります。以下の版番号は例です。実際に公開された取り込み対象の版へ置き換えてください。

```bash
git switch -c update/astro-table
# 初回のみ。upstream登録済みなら git remote -v でURLを確認する
git remote add upstream https://github.com/manji6/astro-table.git
# サイト自身のタグと衝突しない専用の参照へ取得する
git fetch upstream 'refs/tags/*:refs/remotes/upstream/tags/*'
```

## 初回のみ: 作成元を取り込み済みとして記録する

テンプレートから作ったサイトと本体には共通祖先がありません。**サイトの作成元がv0.1.0で、その版の変更がすべて含まれていると確認できる場合だけ**、次の操作で履歴をつなげます。

```bash
git merge -s ours --allow-unrelated-histories upstream/tags/v0.1.0
```

`-s ours` はサイトのファイルを一切変更せず、指定した版までの変更を「取り込み済み」として記録します。最新のタグを無条件で指定すると、未適用の修正まで取り込み済みになり、次のマージでも入らなくなります。`-X ours` は競合箇所だけを自分側優先にする別の指定です。

タグ導入前に作ったサイトで作成元コミットが分かる場合は、そのコミットを取得して記録します。以下のハッシュは実際の作成元の完全なSHAに置き換えます。

```bash
git fetch upstream <作成元コミットSHA>
git merge -s ours --allow-unrelated-histories FETCH_HEAD
```

作成元が分からない場合や、その版の修正が揃っていない場合は、`-s ours` で記録せず、対象タグを通常マージして差分を確認します。

```bash
git merge --no-commit --no-ff --allow-unrelated-histories upstream/tags/v0.1.0
```

この方法ではadd/add競合が多く発生する可能性があります。ファイルを確認し、下の検証を終えてからコミットします。forkから作ったサイトや、すでに本体と履歴がつながっているサイトは、この初回記録を省略します。

## 2回目以降: 対象タグを通常マージする

初回に作成元を記録した場合も、次は更新を通常マージします。たとえばv0.1.0からv0.2.0に更新する場合は次の操作です。v0.2.0は将来の版の例です。

```bash
git fetch upstream 'refs/tags/*:refs/remotes/upstream/tags/*'
git merge --no-commit --no-ff upstream/tags/v0.2.0
```

タグ導入前の作成元からv0.1.0へ更新する場合は、対象を `upstream/tags/v0.1.0` にします。

## 競合の解消と検証

`content/`や`public/`にはサイト固有の変更があります。リリースの差分を確認し、サイトの文言・画像・ドメイン・タグID・`storagePrefix`を維持してください。コア側のファイルでも、独自に変更したレイアウトやBlockは競合することがあります。

意図的にcommerceやデモコンテンツを削除したサイトでは、delete/modify競合になります。削除を維持する対象なら `git rm <対象ファイル>`、更新を取り込む対象なら編集して `git add <対象ファイル>` で解消します。削除したモジュールへのimportや、固定ルートが復活していないかも確認します。どちらを残すか決めずに一括でours/theirsを指定しないでください。

```bash
git status
# 競合を解消して必要なファイルを git add / git rm する
npm install
npm run lint
npm run typecheck
npm test
npm run build
# commerce/member等に関わる変更なら npm run e2e も実行
# サイト固有の設定とビルド結果を確認してから記録する
git add package.json package-lock.json
git commit
```

`npm install` 後の依存関係の差分も確認します。検証後はサイト側でPRを作り、レビューしてマージします。マージ途中でやり直す場合は `git merge --abort` を使います（作業ツリーをきれいにして開始すること）。

取り込み済みの版は次の操作で確認できます。

```bash
git for-each-ref --merged HEAD --format='%(refname:strip=4)' refs/remotes/upstream/tags/
```

作成元の記録と実際の更新マージを残すことで、次回以降は未取り込みの変更だけがマージ対象になります。テンプレートのReleaseワークフローは本体リポジトリ専用なので、サイト側に取り込んでも自動公開はしません。
