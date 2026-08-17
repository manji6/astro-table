// キーワード検索用の軽量JSONインデックス。
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { toProductLocale } from '../../../modules/commerce/lib/locale';

export function getStaticPaths() {
  return ['ja', 'en'].map((locale) => ({ params: { locale } }));
}

export const GET: APIRoute = async ({ params }) => {
  const productLocale = toProductLocale(params.locale as string);
  const products = await getCollection('products');

  const index = products.map((product) => ({
    slug: product.id,
    title: product.data.translations[productLocale].title,
    description: product.data.translations[productLocale].description ?? '',
    price: product.data.prices[productLocale].amount,
    currency: product.data.prices[productLocale].currency,
    image: product.data.images[0],
    categories: product.data.categories,
    tags: product.data.tags,
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
};
