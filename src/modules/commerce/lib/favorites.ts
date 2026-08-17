// お気に入り状態管理。cart.tsと同じパターン(localStorage + 素朴なTS関数 +
// CustomEvent + storageイベントでのクロスタブ同期)を踏襲する。
//
// commerceモジュールからmemberモジュールを参照する片方向依存(の例外)。
// お気に入りは会員でなければ使えない機能のため、追加/削除は`getCurrentMemberId()`で
// ログイン中の会員IDを解決し、未ログインなら操作を拒否する。

import { getCurrentMemberId } from '../../member/lib/member';
import siteConfig from '../../../../site.config';

export type FavoritesChangeAction = 'add' | 'remove' | 'sync';

export interface FavoritesChangeDetail {
  memberId: string;
  favorites: string[];
  action: FavoritesChangeAction;
  slug?: string;
}

declare global {
  interface WindowEventMap {
    'favorites:change': CustomEvent<FavoritesChangeDetail>;
  }
}

const STORAGE_PREFIX = `${siteConfig.storagePrefix}:favorites:`;

function favoritesKey(memberId: string): string {
  return `${STORAGE_PREFIX}${memberId}`;
}

function readFavorites(memberId: string): string[] {
  const raw = localStorage.getItem(favoritesKey(memberId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((slug): slug is string => typeof slug === 'string') : [];
  } catch {
    return [];
  }
}

function writeFavorites(memberId: string, favorites: string[]): void {
  localStorage.setItem(favoritesKey(memberId), JSON.stringify(favorites));
}

function emit(memberId: string, favorites: string[], action: FavoritesChangeAction, slug?: string): void {
  window.dispatchEvent(
    new CustomEvent<FavoritesChangeDetail>('favorites:change', { detail: { memberId, favorites, action, slug } }),
  );
}

export function getFavorites(memberId: string): string[] {
  return readFavorites(memberId);
}

export function isFavorite(memberId: string, slug: string): boolean {
  return readFavorites(memberId).includes(slug);
}

export function addFavorite(slug: string): string[] | null {
  const memberId = getCurrentMemberId();
  if (!memberId) return null;

  const favorites = readFavorites(memberId);
  if (!favorites.includes(slug)) favorites.push(slug);
  writeFavorites(memberId, favorites);
  emit(memberId, favorites, 'add', slug);
  return favorites;
}

export function removeFavorite(slug: string): string[] | null {
  const memberId = getCurrentMemberId();
  if (!memberId) return null;

  const favorites = readFavorites(memberId).filter((item) => item !== slug);
  writeFavorites(memberId, favorites);
  emit(memberId, favorites, 'remove', slug);
  return favorites;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (!event.key || !event.key.startsWith(STORAGE_PREFIX)) return;
    const memberId = event.key.slice(STORAGE_PREFIX.length);
    emit(memberId, readFavorites(memberId), 'sync');
  });
}
