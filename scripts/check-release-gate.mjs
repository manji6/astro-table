#!/usr/bin/env node
// release-gate: 版上げ(package.json の version)とリリースノート(releases/vX.Y.Z.md)が
// 必ずセットになっていることをPR時点で検査する。
// - 判定ロジック(evaluateReleaseGate)は純粋関数。テストは tests/release-gate.test.ts
// - 実行部(main)がgitで情報を集める。BASE_REF で比較元refを指定(未指定は HEAD^)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STABLE_SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const NOTE_PATH = /^releases\/v(.+)\.md$/;

/** 安定版SemVer同士の比較。a>b で正、a<b で負、同値で0。 */
export function compareSemver(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/**
 * @param {object} input
 * @param {string} input.baseVersion 比較元のpackage.json version
 * @param {string} input.headVersion 作業ツリーのpackage.json version
 * @param {{status: string, path: string}[]} input.changes git diff --name-status の結果
 * @param {Record<string, string>} input.notes 追加されたreleases/*.mdのパス→内容
 * @param {{version?: string, rootVersion?: string}} input.lock package-lock.json の version 2箇所
 * @returns {{ok: boolean, errors: string[]}}
 */
export function evaluateReleaseGate({ baseVersion, headVersion, changes, notes, lock }) {
  const errors = [];
  const addedNotes = changes.filter((c) => c.status.startsWith('A') && NOTE_PATH.test(c.path)).map((c) => c.path);
  const versionChanged = baseVersion !== headVersion;

  if (!versionChanged) {
    if (addedNotes.length > 0) {
      errors.push(`リリースノートが追加されていますが version が変わっていません(${baseVersion}): ${addedNotes.join(', ')}`);
    }
    return { ok: errors.length === 0, errors };
  }

  if (!STABLE_SEMVER.test(headVersion)) {
    errors.push(`新しい version "${headVersion}" は安定版SemVer(X.Y.Z)ではありません`);
  } else if (STABLE_SEMVER.test(baseVersion) && compareSemver(headVersion, baseVersion) <= 0) {
    errors.push(`新しい version ${headVersion} は比較元 ${baseVersion} より大きくありません`);
  }

  const expected = `releases/v${headVersion}.md`;
  if (!addedNotes.includes(expected)) {
    errors.push(`${expected} が追加されていません`);
  } else if (!(notes[expected] ?? '').trim()) {
    errors.push(`${expected} が空です`);
  }
  for (const path of addedNotes) {
    if (path !== expected) errors.push(`${path} は新しい version ${headVersion} に対応しないリリースノートです`);
  }

  if (lock?.version !== headVersion) {
    errors.push(`package-lock.json のトップレベル version(${lock?.version})が package.json(${headVersion})と一致しません`);
  }
  if (lock?.rootVersion !== headVersion) {
    errors.push(`package-lock.json の packages[""].version(${lock?.rootVersion})が package.json(${headVersion})と一致しません`);
  }
  return { ok: errors.length === 0, errors };
}

/** `git diff --name-status` の出力をパースする(リネームは新パスを採用)。 */
export function parseNameStatus(output) {
  return output.split('\n').filter(Boolean).map((line) => {
    const [status, ...paths] = line.split('\t');
    return { status, path: paths[paths.length - 1] };
  });
}

const git = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function collectChanges(baseRef) {
  try {
    return parseNameStatus(git(['diff', '--name-status', `${baseRef}...HEAD`]));
  } catch {
    // 3点記法が使えない(merge baseが無い、HEAD^のような単一コミット等)場合は2点間
    return parseNameStatus(git(['diff', '--name-status', baseRef, 'HEAD']));
  }
}

function main() {
  const baseRef = process.env.BASE_REF || 'HEAD^';
  const baseVersion = JSON.parse(git(['show', `${baseRef}:package.json`])).version;
  const headVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
  const changes = collectChanges(baseRef);

  const notes = {};
  for (const c of changes) {
    if (c.status.startsWith('A') && NOTE_PATH.test(c.path) && existsSync(c.path)) {
      notes[c.path] = readFileSync(c.path, 'utf8');
    }
  }
  const lockJson = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const lock = { version: lockJson.version, rootVersion: lockJson.packages?.['']?.version };

  const { ok, errors } = evaluateReleaseGate({ baseVersion, headVersion, changes, notes, lock });
  if (!ok) {
    console.error(`release-gate: 不合格 (${baseVersion} -> ${headVersion})`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`release-gate: 合格 (${baseVersion} -> ${headVersion})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
