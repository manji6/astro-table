import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/modules/commerce/lib/acdl-bridge';
import type { CartChangeDetail } from '../src/modules/commerce/lib/cart';

function dispatchCartChange(detail: CartChangeDetail) {
  window.dispatchEvent(new CustomEvent('cart:change', { detail }));
}

const item = {
  slug: 'running-shoes',
  title: 'Running Shoes',
  price: 12000,
  currency: 'JPY' as const,
  image: '/images/products/running-shoes.svg',
  sku: 'SHOE-001',
  categories: ['shoes'],
};

const cart = { schemaVersion: 2 as const, cartId: 'CART-TEST-001', items: [], updatedAt: new Date().toISOString() };

beforeEach(() => {
  window.adobeDataLayer = { push: vi.fn() };
});

describe('acdl-bridge.ts / cart:change → ACDL push(XDM Commerceイベント設計準拠)', () => {
  it('pushes add-to-cart with productListItems when action is "add"', () => {
    dispatchCartChange({ cart, action: 'add', locale: 'ja-JP', item: { ...item, quantity: 2 } });

    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({
      event: 'add-to-cart',
      commerce: {
        productListAdds: { value: 1, id: expect.any(String) },
        cart: { cartID: 'CART-TEST-001', cartSource: 'product_detail' },
      },
      productListItems: [
        {
          SKU: 'SHOE-001',
          name: 'Running Shoes',
          quantity: 2,
          priceTotal: 24000,
          currencyCode: 'JPY',
          productImageUrl: '/images/products/running-shoes.svg',
          productAddMethod: 'add_to_cart_button',
        },
      ],
    });
  });

  it('pushes remove-from-cart with productListItems when action is "remove"', () => {
    dispatchCartChange({ cart, action: 'remove', locale: 'ja-JP', item: { ...item, quantity: 3 } });

    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({
      event: 'remove-from-cart',
      commerce: {
        productListRemovals: { value: 1, id: expect.any(String) },
        cart: { cartID: 'CART-TEST-001' },
      },
      productListItems: [expect.objectContaining({ SKU: 'SHOE-001', quantity: 3, priceTotal: 36000 })],
    });
  });

  it('pushes remove-from-cart with the decreased amount when a quantity decrease comes via "update"', () => {
    dispatchCartChange({
      cart,
      action: 'update',
      locale: 'ja-JP',
      item: { ...item, quantity: 2 },
      previousQuantity: 5,
    });

    expect(window.adobeDataLayer.push).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'remove-from-cart',
        productListItems: [expect.objectContaining({ quantity: 3, priceTotal: 36000 })],
      }),
    );
  });

  it('pushes add-to-cart with the increased amount when a quantity increase comes via "update"', () => {
    dispatchCartChange({
      cart,
      action: 'update',
      locale: 'ja-JP',
      item: { ...item, quantity: 5 },
      previousQuantity: 2,
    });

    expect(window.adobeDataLayer.push).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'add-to-cart',
        productListItems: [expect.objectContaining({ quantity: 3, priceTotal: 36000 })],
      }),
    );
  });

  it('pushes remove-from-cart when "update" fully removes the item (quantity -> 0)', () => {
    dispatchCartChange({
      cart,
      action: 'update',
      locale: 'ja-JP',
      item: { ...item, quantity: 0 },
      previousQuantity: 4,
    });

    expect(window.adobeDataLayer.push).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'remove-from-cart',
        productListItems: [expect.objectContaining({ quantity: 4, priceTotal: 48000 })],
      }),
    );
  });

  it('does not push anything when "update" leaves the quantity unchanged', () => {
    dispatchCartChange({
      cart,
      action: 'update',
      locale: 'ja-JP',
      item: { ...item, quantity: 3 },
      previousQuantity: 3,
    });

    expect(window.adobeDataLayer.push).not.toHaveBeenCalled();
  });

  it('does not push anything for "clear"', () => {
    dispatchCartChange({ cart, action: 'clear', locale: 'ja-JP' });
    expect(window.adobeDataLayer.push).not.toHaveBeenCalled();
  });

  it('does not push anything for "sync" (: 同期は計測対象外)', () => {
    dispatchCartChange({ cart, action: 'sync', locale: 'ja-JP' });
    expect(window.adobeDataLayer.push).not.toHaveBeenCalled();
  });
});
