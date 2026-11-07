// 実際に生成するルートをURLパスへ変換する。i18n無効時にも利用できる。
export function pagePathname(path: string, { base = '/', trailingSlash = 'ignore', build }: {
  base?: string;
  trailingSlash?: string;
  build?: { format?: string };
} = {}): string {
  const pathname = '/' + [base, path].join('/').split('/').filter(Boolean).join('/');
  const appendSlash = trailingSlash === 'always' ||
    (trailingSlash === 'ignore' && (build?.format ?? 'directory') === 'directory');
  return pathname !== '/' && appendSlash ? pathname + '/' : pathname;
}

export type LocaleConfig = string | { path: string; codes: string[] };

export function localeLanguages(locales: LocaleConfig[]): Map<string, string> {
  return new Map(locales.map((locale) => typeof locale === 'string'
    ? [locale, locale] : [locale.path, locale.codes[0]]));
}

export function hasNoindexMetadata(metadata: Array<{ name: string; value: string }>): boolean {
  return metadata.some(({ name, value }) =>
    /^(robots|googlebot)$/i.test(name) && /\b(noindex|none)\b/i.test(value));
}

// 呼び出し側が存在を確認した翻訳先だけを受け取る。ルートやコンテンツ層に依存しない。
export interface TranslationLink {
  locale: string;
  pathname: string;
  noindex?: boolean;
}

export interface SeoLink {
  rel: 'canonical' | 'alternate';
  href: string;
  hreflang?: string;
}

export function buildSeoLinks({ site, pathname, noindex = false, defaultLocale, translations = [] }: {
  site?: string | URL;
  pathname: string;
  noindex?: boolean;
  defaultLocale?: string;
  translations?: TranslationLink[];
}): SeoLink[] {
  if (!site) return [];
  const absolute = (path: string) => {
    const url = new URL(path, site);
    url.search = '';
    url.hash = '';
    return url.href;
  };
  const links: SeoLink[] = [{ rel: 'canonical', href: absolute(pathname) }];
  if (noindex || !defaultLocale) return links;
  const indexable = translations.filter((translation) => !translation.noindex);
  for (const translation of indexable) {
    links.push({ rel: 'alternate', hreflang: translation.locale, href: absolute(translation.pathname) });
  }
  const fallback = indexable.find((translation) => translation.locale === defaultLocale);
  if (fallback) links.push({ rel: 'alternate', hreflang: 'x-default', href: absolute(fallback.pathname) });
  return links;
}
