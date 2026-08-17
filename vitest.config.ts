import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // vitest v4はhappy-domの統合に専用パッケージ(vitest-environment-happy-dom)を要求するが
    // 現在npm未公開のため、公式のGlobalRegistratorをsetupFilesで使う方式に切り替えている。
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
