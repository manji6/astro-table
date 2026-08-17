import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pageType: z
      .enum(['top', 'campaign', 'category', 'search', 'product', 'cart', 'checkout', 'confirmation', 'order-complete', 'other'])
      .default('other'),
    ogImage: z.string().optional(),
    noindex: z.boolean().default(false),
  }),
});

// commerceモジュール、i18nオプトイン時のスキーマ
const products = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './content/products' }),
  schema: z.object({
    sku: z.string(),
    images: z.array(z.string()).min(1),
    categories: z.array(z.string()).min(1),
    tags: z.array(z.string()).default([]),
    stock: z.enum(['in_stock', 'out_of_stock']).default('in_stock'),
    prices: z.record(
      z.enum(['ja-JP', 'en-US']),
      z.object({ currency: z.enum(['JPY', 'USD']), amount: z.number() }),
    ),
    translations: z.record(
      z.enum(['ja-JP', 'en-US']),
      z.object({ title: z.string(), description: z.string().optional() }),
    ),
  }),
});

// カテゴリキー→表示名の対訳辞書
const taxonomy = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './content/taxonomy' }),
  schema: z.record(z.string(), z.string()),
});

// Blockライブラリページ用。各Block(src/blocks/<name>/)に添える表示サンプル。あえて/contentではなくBlockの実装と
// 同じ場所(src/blocks配下)に置く。Blockのコードと一緒にメンテナンスされるべき開発ツール
// 用の資材であり、サイト運用者が差し替える「サイトコンテンツ」ではないため。
// example.mdが既定(ロケール非依存/日本語)、example.<locale>.md はロケール別の上書き(任意)。
const blockExamples = defineCollection({
  loader: glob({ pattern: '*/example*.md', base: './src/blocks' }),
  schema: z.object({
    description: z.string(),
    category: z.string().default('general'),
    searchTags: z.array(z.string()).default([]),
  }),
});

export const collections = { pages, products, taxonomy, blockExamples };
