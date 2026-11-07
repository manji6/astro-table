import { describe, expect, it } from 'vitest';
import { buildSeoLinks, hasNoindexMetadata, localeLanguages, pagePathname } from '../src/lib/seo-links';

const options = {
  site: 'https://example.com',
  pathname: '/ja/about/',
  defaultLocale: 'ja',
  translations: [
    { locale: 'ja', pathname: '/ja/about/' },
    { locale: 'en', pathname: '/en/about/' },
  ],
};

describe('buildSeoLinks', () => {
  it('emits nothing without site', () => {
    expect(buildSeoLinks({ ...options, site: undefined })).toEqual([]);
  });
  it('uses the site origin and actual pathname for canonical', () => {
    expect(buildSeoLinks({ site: 'https://example.com/base', pathname: '/base/about/' })).toEqual([
      { rel: 'canonical', href: 'https://example.com/base/about/' },
    ]);
  });
  it('emits known translations and x-default', () => {
    expect(buildSeoLinks(options)).toEqual([
      { rel: 'canonical', href: 'https://example.com/ja/about/' },
      { rel: 'alternate', hreflang: 'ja', href: 'https://example.com/ja/about/' },
      { rel: 'alternate', hreflang: 'en', href: 'https://example.com/en/about/' },
      { rel: 'alternate', hreflang: 'x-default', href: 'https://example.com/ja/about/' },
    ]);
  });
  it('omits missing or noindex translations and missing x-default', () => {
    const links = buildSeoLinks({ ...options, translations: [
      { locale: 'ja', pathname: '/ja/about/', noindex: true },
      { locale: 'en', pathname: '/en/about/' },
    ] });
    expect(links.map((link) => link.hreflang)).toEqual([undefined, 'en']);
  });
  it('keeps canonical but suppresses all alternates on noindex pages', () => {
    expect(buildSeoLinks({ ...options, noindex: true })).toEqual([
      { rel: 'canonical', href: 'https://example.com/ja/about/' },
    ]);
  });
  it('suppresses alternates when i18n is disabled', () => {
    expect(buildSeoLinks({ ...options, defaultLocale: undefined })).toHaveLength(1);
  });
  it('retains encoded paths and removes queries and fragments', () => {
    expect(buildSeoLinks({ site: options.site, pathname: '/ja/%E6%97%A5?x=1#top' })[0].href)
      .toBe('https://example.com/ja/%E6%97%A5');
  });
});


describe('SEO configuration', () => {
  it('supports custom locale paths and language codes', () => {
    expect([...localeLanguages(['en', { path: 'jp', codes: ['ja-JP', 'ja'] }])])
      .toEqual([['en', 'en'], ['jp', 'ja-JP']]);
  });
  it('recognizes noindex and none in robots metadata, case insensitively', () => {
    for (const value of ['noindex, follow', 'NOINDEX', 'none']) {
      expect(hasNoindexMetadata([{ name: 'Robots', value }])).toBe(true);
    }
    expect(hasNoindexMetadata([{ name: 'googlebot', value: 'noindex' }])).toBe(true);
    expect(hasNoindexMetadata([{ name: 'description', value: 'noindex' }])).toBe(false);
    expect(hasNoindexMetadata([{ name: 'robots', value: 'index, nofollow' }])).toBe(false);
  });
});


describe('pagePathname', () => {
  it('preserves the generated route prefix, base and trailing slash', () => {
    expect(pagePathname('ja/docs', { base: '/demo/', trailingSlash: 'always' })).toBe('/demo/ja/docs/');
    expect(pagePathname('docs')).toBe('/docs/');
    expect(pagePathname('docs', { build: { format: 'file' } })).toBe('/docs');
    expect(pagePathname('', { trailingSlash: 'never' })).toBe('/');
    expect(pagePathname('ja/', { trailingSlash: 'never' })).toBe('/ja');
  });
});
