// ACDLパターンA: 中央集権ブリッジ。
// cart.tsが発火する`cart:change`(ベンダー非依存)を購読し、ACDLへのpushに変換する。
// cart.ts自身はACDLの存在を一切知らない。
// ペイロード構造はXDM Commerceイベント設計(productListItems配列 + commerce.cart.cartID)に
// 準拠する。ACDL側のイベント名(add-to-cart等)自体はXDMのeventTypeとは独立していてよいが、
// 本サイトではACDL/XDM双方で同じ名前を使う。

import type { CartChangeDetail, CartItem } from './cart';

// priceTotalは単価ではなく「その明細行の合計金額」(単価 × quantity)。
// start-checkout/purchase-complete側(checkout/confirmation/orderページ)からも共有する。
export function toProductListItem(item: CartItem, quantity: number) {
  return {
    SKU: item.sku,
    name: item.title,
    quantity,
    priceTotal: item.price * quantity,
    currencyCode: item.currency,
    productImageUrl: item.image,
  };
}

function pushProductListAdd(cartId: string, item: CartItem, quantity: number): void {
  window.adobeDataLayer.push({
    event: 'add-to-cart',
    commerce: {
      productListAdds: { value: 1, id: crypto.randomUUID() },
      cart: { cartID: cartId, cartSource: 'product_detail' },
    },
    productListItems: [{ ...toProductListItem(item, quantity), productAddMethod: 'add_to_cart_button' }],
  });
}

function pushProductListRemoval(cartId: string, item: CartItem, quantity: number): void {
  window.adobeDataLayer.push({
    event: 'remove-from-cart',
    commerce: {
      productListRemovals: { value: 1, id: crypto.randomUUID() },
      cart: { cartID: cartId },
    },
    productListItems: [toProductListItem(item, quantity)],
  });
}

function handleCartChange(detail: CartChangeDetail): void {
  const cartId = detail.cart.cartId;

  if (detail.action === 'add' && detail.item) {
    pushProductListAdd(cartId, detail.item, detail.item.quantity);
    return;
  }

  if (detail.action === 'remove' && detail.item) {
    pushProductListRemoval(cartId, detail.item, detail.item.quantity);
    return;
  }

  if (detail.action === 'update' && detail.item && detail.previousQuantity !== undefined) {
    const delta = detail.item.quantity - detail.previousQuantity;
    if (delta === 0) return;
    if (delta > 0) {
      pushProductListAdd(cartId, detail.item, delta);
    } else {
      pushProductListRemoval(cartId, detail.item, -delta);
    }
    return;
  }

  // 'clear' / 'sync' はACDL pushの対象外。
}

window.addEventListener('cart:change', (event) => handleCartChange(event.detail));
