// 実際のビルド結果を検証する。作業ツリーを変更しない隔離コピーで実行する。
// node scripts/test-head-links.mjs
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const source = dirname(dirname(fileURLToPath(import.meta.url)));
const root = mkdtempSync(join(tmpdir(), 'astro-table-head-'));
const read = (path) => readFileSync(join(root, path), 'utf8');
const write = (path, text) => writeFileSync(join(root, path), text);
const html = (path) => read(`dist/${path}/index.html`);
const links = (path) => [...html(path).matchAll(/<link\b[^>]*>/g)].map(([tag]) =>
  Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) =>
    [key, value.replaceAll('&amp;', '&')])));
const languages = (path) => links(path).filter((link) => link.hreflang).map((link) => link.hreflang).sort();
const build = () => {
  try {
    execFileSync('npm', ['run', 'build'], {
      cwd: root, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }, stdio: 'pipe',
    });
  } catch (error) {
    throw new Error(`${error.message}\n${error.stdout?.toString() ?? ''}${error.stderr?.toString() ?? ''}`, { cause: error });
  }
};
try {
  cpSync(source, root, { recursive: true, filter: (path) =>
    !['node_modules', '.git', '.astro', 'dist', 'test-results', 'playwright-report'].some((part) =>
      path.slice(source.length).split('/').includes(part)) });
  symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'), 'dir');
  build();
  assert.equal(links('ja/docs').some((link) => ['canonical', 'alternate'].includes(link.rel)), false);

  const config = read('astro.config.mjs');
  write('astro.config.mjs', config.replace('defineConfig({', `defineConfig({
    site: 'https://seo.example.test', base: '/demo', trailingSlash: 'always',`));
  write('site.config.ts', read('site.config.ts').replace('const siteConfig: SiteConfig = {', `const siteConfig: SiteConfig = {
    head: { links: [
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://example.test/font.css?a=1&b=2' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ] },`));
  for (const language of ['ja', 'en']) {
    for (const name of ['seo-fixture', 'seo-noindex', 'seo-metadata']) {
      write(`content/pages/${language}/${name}.md`, '---\ntitle: SEO fixture\n' +
        (name === 'seo-noindex' && language === 'en' ? 'noindex: true\n' : '') + '---\n\nText\n' +
        (name === 'seo-metadata' && language === 'en' ? '\n| metadata | |\n|---|---|\n| robots | noindex, follow |\n' : ''));
    }
  }
  write('content/pages/ja/seo-only.md', '---\ntitle: Only\n---\n\nText\n');
  build();
  for (const path of ['ja/seo-fixture', 'ja/docs', 'ja/commerce']) {
    assert(links(path).some((link) => link.rel === 'canonical' && link.href === `https://seo.example.test/demo/${path}/`));
    assert.deepEqual(languages(path), ['en', 'ja', 'x-default']);
  }
  for (const name of ['seo-noindex', 'seo-metadata']) {
    assert.deepEqual(languages(`ja/${name}`), ['ja', 'x-default']);
    assert.deepEqual(languages(`en/${name}`), []);
  }
  assert.deepEqual(languages('ja/seo-only'), ['ja', 'x-default']);
  const customLinks = links('ja/seo-fixture');
  assert(customLinks.some((link) => link.crossorigin === 'anonymous'));
  assert(customLinks.some((link) => link.href === 'https://example.test/font.css?a=1&b=2'));
  assert(customLinks.some((link) => link.rel === 'icon' && link.type === 'image/svg+xml'));
  assert(html('ja/seo-fixture').indexOf('fonts.gstatic.com') < html('ja/seo-fixture').indexOf('window.adobeDataLayer'));

  // 単一言語テンプレート相当: オプトインの固定ルート・コンテンツを除く。
  write('astro.config.mjs', "import { defineConfig } from 'astro/config';\nexport default defineConfig({ site: 'https://seo.example.test' });");
  rmSync(join(root, 'src/pages/[locale]'), { recursive: true });
  rmSync(join(root, 'src/pages/index.astro'));
  rmSync(join(root, 'content/pages'), { recursive: true });
  cpSync(join(source, 'content/pages/ja'), join(root, 'content/pages'), { recursive: true });
  // i18nドキュメントの解除手順に従いLanguageSwitcherの使用も外す。
  write('src/layouts/Base.astro', read('src/layouts/Base.astro')
    .replace("import LanguageSwitcher from '../components/LanguageSwitcher.astro';", '')
    .replace('{locale && <LanguageSwitcher locale={locale} path={path} />}', ''));
  build();
  assert(links('docs').some((link) => link.rel === 'canonical' && link.href === 'https://seo.example.test/docs/'), JSON.stringify(links('docs')));
  assert.deepEqual(languages('docs'), []);
  console.log('Head integration checks passed (site omitted, i18n, noindex, custom links, single language).');
} finally {
  rmSync(root, { recursive: true, force: true });
}
