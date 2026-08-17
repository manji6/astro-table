// ルートロケール(astro.config.mjsのi18n.locales: 'ja'/'en')と、
// 商品データ/カートのロケールキー(: 'ja-JP'/'en-US')の対応表。
export const PRODUCT_LOCALE_BY_ROUTE_LOCALE: Record<string, 'ja-JP' | 'en-US'> = {
  ja: 'ja-JP',
  en: 'en-US',
};

export function toProductLocale(routeLocale: string): 'ja-JP' | 'en-US' {
  const productLocale = PRODUCT_LOCALE_BY_ROUTE_LOCALE[routeLocale];
  if (!productLocale) {
    throw new Error(`Unknown route locale "${routeLocale}". Known locales: ${Object.keys(PRODUCT_LOCALE_BY_ROUTE_LOCALE).join(', ')}`);
  }
  return productLocale;
}
