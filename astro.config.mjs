// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// i18nはオプトイン機能。ja/enを実際にオプトインして使う。
export default defineConfig({
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en'],
    routing: { prefixDefaultLocale: true },
  },
});
