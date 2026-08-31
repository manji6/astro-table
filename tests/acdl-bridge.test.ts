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

const emptyCart = { schemaVersion: 1 as const, items: [], updatedAt: new Date().toISOString() };

beforeEach(() => {
  window.adobeDataLayer = { push: vi.fn() };
});

describe('acdl-bridge.ts / cart:change → ACDL push(・§3.2)', () => {
  it('pushes add_to_cart when action is "add"', () => {
    dispatchCartChange({ cart: emptyCart, action: 'add', locale: 'ja-JP', item: { ...item, quantity: 2 } });

    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({
      event: 'add_to_cart',
      product: {
        SKU: 'SHOE-001',
        name: 'Running Shoes',
        categories: ['shoes'],
        priceTotal: 12000,
        currencyCode: 'JPY',
        productImageUrl: '/images/products/running-shoes.svg',
        quantity: 2,
      },
    });
  });

  it('pushes remove_from_cart when action is "remove"', () => {
    dispatchCartChange({ cart: emptyCart, action: 'remove', locale: 'ja-JP', item: { ...item, quantity: 3 } });

    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({
      event: 'remove_from_cart',
      product: expect.objectContaining({ SKU: 'SHOE-001', quantity: 3 }),
    });
  });

  it('pushes remove_from_cart with the decreased amount when a quantity decrease comes via "update"', () => {
    dispatchCartChange({
      cart: emptyCart,
      action: 'update',
      locale: 'ja-JP',
      item: { ...item, quantity: 2 },
      previousQuantity: 5,
    });

    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({
      event: 'remove_from_cart',
      product: expect.objectContaining({ quantity: 3 }),
    });
  });

  it('pushes add_to_cart with the increased amount when a quantity increase comes via "update"', () => {
    dispatchCartChange({
      cart: emptyCart,
      action: 'update',
      locale: 'ja-JP',
      item: { ...item, quantity: 5 },
      previousQuantity: 2,
    });

    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({
      event: 'add_to_cart',
      product: expect.objectContaining({ quantity: 3 }),
    });
  });

  it('pushes remove_from_cart when "update" fully removes the item (quantity -> 0)', () => {
    dispatchCartChange({
      cart: emptyCart,
      action: 'update',
      locale: 'ja-JP',
      item: { ...item, quantity: 0 },
      previousQuantity: 4,
    });

    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({
      event: 'remove_from_cart',
      product: expect.objectContaining({ quantity: 4 }),
    });
  });

  it('does not push anything when "update" leaves the quantity unchanged', () => {
    dispatchCartChange({
      cart: emptyCart,
      action: 'update',
      locale: 'ja-JP',
      item: { ...item, quantity: 3 },
      previousQuantity: 3,
    });

    expect(window.adobeDataLayer.push).not.toHaveBeenCalled();
  });

  it('does not push anything for "clear"', () => {
    dispatchCartChange({ cart: emptyCart, action: 'clear', locale: 'ja-JP' });
    expect(window.adobeDataLayer.push).not.toHaveBeenCalled();
  });

  it('does not push anything for "sync" (: 同期は計測対象外)', () => {
    dispatchCartChange({ cart: emptyCart, action: 'sync', locale: 'ja-JP' });
    expect(window.adobeDataLayer.push).not.toHaveBeenCalled();
  });
});
