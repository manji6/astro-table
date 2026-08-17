// ACDLパターンA: 中央集権ブリッジ。
// cart.tsが発火する`cart:change`(ベンダー非依存)を購読し、ACDLへのpushに変換する。
// cart.ts自身はACDLの存在を一切知らない。

import type { CartChangeDetail, CartItem } from './cart';

function toProductPayload(item: CartItem, quantity: number) {
  return {
    sku: item.sku,
    name: item.title,
    categories: item.categories,
    price: item.price,
    currency: item.currency,
    quantity,
  };
}

function handleCartChange(detail: CartChangeDetail): void {
  if (detail.action === 'add' && detail.item) {
    window.adobeDataLayer.push({ event: 'add_to_cart', product: toProductPayload(detail.item, detail.item.quantity) });
    return;
  }

  if (detail.action === 'remove' && detail.item) {
    window.adobeDataLayer.push({
      event: 'remove_from_cart',
      product: toProductPayload(detail.item, detail.item.quantity),
    });
    return;
  }

  if (detail.action === 'update' && detail.item && detail.previousQuantity !== undefined) {
    const delta = detail.item.quantity - detail.previousQuantity;
    if (delta === 0) return;
    if (delta > 0) {
      window.adobeDataLayer.push({ event: 'add_to_cart', product: toProductPayload(detail.item, delta) });
    } else {
      window.adobeDataLayer.push({ event: 'remove_from_cart', product: toProductPayload(detail.item, -delta) });
    }
    return;
  }

  // 'clear' / 'sync' はACDL pushの対象外。
}

window.addEventListener('cart:change', (event) => handleCartChange(event.detail));
