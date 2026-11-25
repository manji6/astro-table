#!/usr/bin/env node
// shot: 指定パスのフルページスクリーンショット(PC/モバイル)を screenshots/ に保存する。
// 使い方: npm run shot -- /ja/example/ [/en/ ...]
// - slug変換(pathToSlug)は純粋関数。テストは tests/shot.test.ts
// - import されただけでは本体(main)は動かない
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE_URL = 'http://localhost:4321';
const OUT_DIR = 'screenshots';
const POLL_TIMEOUT_MS = 30_000;
const VIEWPORTS = [
  { name: 'pc', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

/** パス → ファイル名用slug。`/`は home、`/ja/example/` は ja-example。 */
export function pathToSlug(path) {
  const clean = path.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  return clean === '' ? 'home' : clean.replace(/\/+/g, '-');
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

async function isUp() {
  try {
    await fetch(BASE_URL + '/', { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
}

async function waitUntilUp(child) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('preview が終了しました(code ' + child.exitCode + ')');
    if (await isUp()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('preview が ' + POLL_TIMEOUT_MS / 1000 + ' 秒以内に応答しませんでした');
}

async function main() {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    console.error('使い方: npm run shot -- <path> [<path> ...]\n例: npm run shot -- /ja/example/');
    process.exit(1);
  }

  const build = spawnSync(npm, ['run', 'build'], { stdio: 'inherit' });
  if (build.status !== 0) {
    console.error('shot: build に失敗しました');
    process.exit(1);
  }

  let preview = null;
  const stopPreview = () => {
    // npm → astro preview と孫プロセスが残るため、プロセスグループごと止める
    if (preview && preview.exitCode === null) {
      try {
        process.kill(-preview.pid, 'SIGTERM');
      } catch {
        // 既に終了している
      }
    }
  };
  process.on('SIGINT', () => {
    stopPreview();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    stopPreview();
    process.exit(143);
  });

  let failed = false;
  let browser;
  try {
    // 既に起動していればそれを使い、止めない
    if (!(await isUp())) {
      preview = spawn(npm, ['run', 'preview'], { stdio: 'ignore', detached: true });
      await waitUntilUp(preview);
    }

    const { chromium } = await import('@playwright/test');
    browser = await chromium.launch();
    mkdirSync(OUT_DIR, { recursive: true });

    for (const path of paths) {
      const slug = pathToSlug(path);
      const url = new URL(path.startsWith('/') ? path : '/' + path, BASE_URL).href;
      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        try {
          const page = await context.newPage();
          const res = await page.goto(url, { waitUntil: 'networkidle' });
          const status = res?.status() ?? 0;
          if (status >= 400) {
            console.error('NG  ' + path + ' (' + vp.name + '): HTTP ' + status);
            failed = true;
            continue;
          }
          const file = OUT_DIR + '/' + slug + '-' + vp.name + '.png';
          await page.screenshot({ path: file, fullPage: true });
          console.log('OK  ' + file);
        } catch (e) {
          console.error('NG  ' + path + ' (' + vp.name + '): ' + e.message);
          failed = true;
        } finally {
          await context.close();
        }
      }
    }
  } catch (e) {
    console.error('shot: ' + e.message);
    failed = true;
  } finally {
    await browser?.close();
    stopPreview();
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
