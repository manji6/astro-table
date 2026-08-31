import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addItem, clearCart, getCart, removeItem, updateQuantity } from '../src/modules/commerce/lib/cart';

const JA = 'ja-JP';
const EN = 'en-US';

const sampleItem = {
  slug: 'running-shoes',
  title: 'Running Shoes',
  price: 12000,
  currency: 'JPY' as const,
  image: '/images/products/running-shoes.svg',
  sku: 'SHOE-001',
  categories: ['shoes'],
};

beforeEach(() => {
  localStorage.clear();
});

describe('cart.ts / 状態遷移', () => {
  it('getCart returns an empty cart with a freshly issued cartId when nothing is stored', () => {
    expect(getCart(JA)).toMatchObject({ schemaVersion: 2, items: [], cartId: expect.any(String) });
  });

  it('getCart keeps returning the same cartId across calls', () => {
    expect(getCart(JA).cartId).toBe(getCart(JA).cartId);
  });

  it('clearCart issues a new cartId', () => {
    const before = getCart(JA).cartId;
    addItem(JA, sampleItem, 1);
    const after = clearCart(JA).cartId;
    expect(after).not.toBe(before);
  });

  it('addItem adds a new item with the given quantity', () => {
    const cart = addItem(JA, sampleItem, 2);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({ slug: 'running-shoes', quantity: 2 });
  });

  it('addItem increments quantity when the same slug is added again', () => {
    addItem(JA, sampleItem, 1);
    const cart = addItem(JA, sampleItem, 3);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(4);
  });

  it('updateQuantity changes the quantity of an existing item', () => {
    addItem(JA, sampleItem, 1);
    const cart = updateQuantity(JA, sampleItem.slug, 5);
    expect(cart.items[0].quantity).toBe(5);
  });

  it('updateQuantity removes the item when quantity is set to 0', () => {
    addItem(JA, sampleItem, 1);
    const cart = updateQuantity(JA, sampleItem.slug, 0);
    expect(cart.items).toHaveLength(0);
  });

  it('removeItem removes the item by slug', () => {
    addItem(JA, sampleItem, 1);
    const cart = removeItem(JA, sampleItem.slug);
    expect(cart.items).toHaveLength(0);
  });

  it('clearCart empties all items', () => {
    addItem(JA, sampleItem, 1);
    addItem(JA, { ...sampleItem, slug: 'canvas-tote' }, 1);
    const cart = clearCart(JA);
    expect(cart.items).toEqual([]);
  });

  it('persists across calls via localStorage', () => {
    addItem(JA, sampleItem, 2);
    expect(getCart(JA).items).toHaveLength(1);
  });
});

describe('cart.ts / ロケール別キー分離', () => {
  it('keeps ja-JP and en-US carts independent', () => {
    addItem(JA, sampleItem, 1);
    expect(getCart(JA).items).toHaveLength(1);
    expect(getCart(EN).items).toHaveLength(0);

    addItem(EN, { ...sampleItem, currency: 'USD' }, 5);
    expect(getCart(JA).items[0].quantity).toBe(1);
    expect(getCart(EN).items[0].quantity).toBe(5);
  });
});

describe('cart.ts / cart:changeイベント', () => {
  it('dispatches cart:change with action "add" and the affected item', () => {
    const handler = vi.fn();
    window.addEventListener('cart:change', handler);
    addItem(JA, sampleItem, 1);
    window.removeEventListener('cart:change', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.action).toBe('add');
    expect(detail.locale).toBe(JA);
    expect(detail.item).toMatchObject({ slug: 'running-shoes', quantity: 1 });
  });

  it('dispatches cart:change with action "remove" on removeItem', () => {
    addItem(JA, sampleItem, 1);
    const handler = vi.fn();
    window.addEventListener('cart:change', handler);
    removeItem(JA, sampleItem.slug);
    window.removeEventListener('cart:change', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.action).toBe('remove');
  });

  it('dispatches cart:change with action "update" and previousQuantity on updateQuantity', () => {
    addItem(JA, sampleItem, 1);
    const handler = vi.fn();
    window.addEventListener('cart:change', handler);
    updateQuantity(JA, sampleItem.slug, 4);
    window.removeEventListener('cart:change', handler);

    const detail = handler.mock.calls[0][0].detail;
    expect(detail.action).toBe('update');
    expect(detail.previousQuantity).toBe(1);
    expect(detail.item?.quantity).toBe(4);
  });

  it('includes the item (with quantity 0) and previousQuantity when updateQuantity removes it via 0', () => {
    addItem(JA, sampleItem, 3);
    const handler = vi.fn();
    window.addEventListener('cart:change', handler);
    updateQuantity(JA, sampleItem.slug, 0);
    window.removeEventListener('cart:change', handler);

    const detail = handler.mock.calls[0][0].detail;
    expect(detail.previousQuantity).toBe(3);
    expect(detail.item).toMatchObject({ slug: sampleItem.slug, quantity: 0, sku: sampleItem.sku });
  });

  it('dispatches cart:change with action "clear" on clearCart', () => {
    addItem(JA, sampleItem, 1);
    const handler = vi.fn();
    window.addEventListener('cart:change', handler);
    clearCart(JA);
    window.removeEventListener('cart:change', handler);

    expect(handler.mock.calls[0][0].detail.action).toBe('clear');
  });
});

describe('cart.ts / 複数タブ間同期', () => {
  it('re-dispatches cart:change with action "sync" when a matching storage key changes from another tab', () => {
    const handler = vi.fn();
    window.addEventListener('cart:change', handler);
    // 他タブでの変更はstorageイベントとして届く(自タブでの変更ではstorageイベントは発火しない)。
    localStorage.setItem('astro-table:cart:ja-JP', JSON.stringify(addItem(JA, sampleItem, 1)));
    handler.mockClear();
    window.dispatchEvent(new StorageEvent('storage', { key: 'astro-table:cart:ja-JP', newValue: '{}' }));
    window.removeEventListener('cart:change', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ action: 'sync', locale: 'ja-JP' });
  });

  it('ignores storage events for unrelated keys', () => {
    const handler = vi.fn();
    window.addEventListener('cart:change', handler);
    window.dispatchEvent(new StorageEvent('storage', { key: 'some-other-app:setting' }));
    window.removeEventListener('cart:change', handler);

    expect(handler).not.toHaveBeenCalled();
  });
});
