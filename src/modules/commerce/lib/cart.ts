// カート状態管理。ツールベンダーに一切依存しない。
// マーケティングツール向けの変換(ACDL等)はacdl-bridge.tsが`cart:change`イベントを購読して行う。

import siteConfig from '../../../../site.config';

export type CartItem = {
  slug: string;
  title: string;
  price: number;
  currency: 'JPY' | 'USD';
  image: string;
  quantity: number;
  // ACDLの add_to_cart/remove_from_cart ペイロードに必要な拡張フィールド。
  sku: string;
  categories: string[];
};

export type Cart = {
  schemaVersion: 1;
  items: CartItem[];
  updatedAt: string;
};

export type CartChangeAction = 'add' | 'update' | 'remove' | 'clear' | 'sync';

export interface CartChangeDetail {
  cart: Cart;
  action: CartChangeAction;
  locale: string;
  item?: CartItem;
  // action === 'update' の場合のみ、変更前の数量(ACDLブリッジがadd/removeの向きを判定するために使う)
  previousQuantity?: number;
}

declare global {
  interface WindowEventMap {
    'cart:change': CustomEvent<CartChangeDetail>;
  }
}

const STORAGE_PREFIX = `${siteConfig.storagePrefix}:cart:`;

function cartKey(locale: string): string {
  return `${STORAGE_PREFIX}${locale}`;
}

function emptyCart(): Cart {
  return { schemaVersion: 1, items: [], updatedAt: new Date(0).toISOString() };
}

function readCart(locale: string): Cart {
  const raw = localStorage.getItem(cartKey(locale));
  if (!raw) return emptyCart();
  try {
    const parsed = JSON.parse(raw) as Cart;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.items)) return emptyCart();
    return parsed;
  } catch {
    return emptyCart();
  }
}

function writeCart(locale: string, cart: Cart): void {
  localStorage.setItem(cartKey(locale), JSON.stringify(cart));
}

function emit(locale: string, cart: Cart, action: CartChangeAction, item?: CartItem, previousQuantity?: number): void {
  window.dispatchEvent(
    new CustomEvent<CartChangeDetail>('cart:change', { detail: { cart, action, locale, item, previousQuantity } }),
  );
}

export function getCart(locale: string): Cart {
  return readCart(locale);
}

export function addItem(locale: string, item: Omit<CartItem, 'quantity'>, quantity = 1): Cart {
  const cart = readCart(locale);
  const existing = cart.items.find((i) => i.slug === item.slug);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ ...item, quantity });
  }
  cart.updatedAt = new Date().toISOString();
  writeCart(locale, cart);
  emit(locale, cart, 'add', cart.items.find((i) => i.slug === item.slug));
  return cart;
}

export function updateQuantity(locale: string, slug: string, quantity: number): Cart {
  const cart = readCart(locale);
  const item = cart.items.find((i) => i.slug === slug);
  const previousQuantity = item?.quantity;

  if (item) {
    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.slug !== slug);
      item.quantity = 0;
    } else {
      item.quantity = quantity;
    }
  }
  cart.updatedAt = new Date().toISOString();
  writeCart(locale, cart);
  // itemのquantityは常に「変更後」の値(削除時は0)。previousQuantityが「変更前」の値。
  emit(locale, cart, 'update', item, previousQuantity);
  return cart;
}

export function removeItem(locale: string, slug: string): Cart {
  const cart = readCart(locale);
  const removed = cart.items.find((i) => i.slug === slug);
  cart.items = cart.items.filter((i) => i.slug !== slug);
  cart.updatedAt = new Date().toISOString();
  writeCart(locale, cart);
  emit(locale, cart, 'remove', removed);
  return cart;
}

export function clearCart(locale: string): Cart {
  const cart = emptyCart();
  writeCart(locale, cart);
  emit(locale, cart, 'clear');
  return cart;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (!event.key || !event.key.startsWith(STORAGE_PREFIX)) return;
    const locale = event.key.slice(STORAGE_PREFIX.length);
    emit(locale, readCart(locale), 'sync');
  });
}
