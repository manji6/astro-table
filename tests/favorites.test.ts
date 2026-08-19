import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addFavorite, getFavorites, isFavorite, removeFavorite } from '../src/modules/commerce/lib/favorites';
import { saveMember, login, logout } from '../src/modules/member/lib/member';

beforeEach(() => {
  localStorage.clear();
});

describe('favorites.ts / 未ログイン時の拒否', () => {
  it('addFavorite returns null and does not persist when nobody is logged in', () => {
    expect(addFavorite('running-shoes')).toBeNull();
    expect(getFavorites('member-001')).toEqual([]);
  });

  it('removeFavorite returns null when nobody is logged in', () => {
    expect(removeFavorite('running-shoes')).toBeNull();
  });
});

describe('favorites.ts / ログイン中会員のCRUD', () => {
  beforeEach(() => {
    saveMember('member-001', 'member-001@example.com', {});
    login('member-001');
  });

  it('getFavorites returns an empty list when nothing is stored', () => {
    expect(getFavorites('member-001')).toEqual([]);
  });

  it('addFavorite adds a product slug for the current member', () => {
    const favorites = addFavorite('running-shoes');
    expect(favorites).toEqual(['running-shoes']);
    expect(getFavorites('member-001')).toEqual(['running-shoes']);
  });

  it('addFavorite does not add the same slug twice', () => {
    addFavorite('running-shoes');
    const favorites = addFavorite('running-shoes');
    expect(favorites).toEqual(['running-shoes']);
  });

  it('isFavorite reflects whether a slug is registered', () => {
    expect(isFavorite('member-001', 'running-shoes')).toBe(false);
    addFavorite('running-shoes');
    expect(isFavorite('member-001', 'running-shoes')).toBe(true);
  });

  it('removeFavorite removes a slug for the current member', () => {
    addFavorite('running-shoes');
    addFavorite('canvas-tote');
    const favorites = removeFavorite('running-shoes');
    expect(favorites).toEqual(['canvas-tote']);
  });

  it('keeps favorites separate per member', () => {
    addFavorite('running-shoes');
    saveMember('member-002', 'member-002@example.com', {});
    login('member-002');
    addFavorite('canvas-tote');

    expect(getFavorites('member-001')).toEqual(['running-shoes']);
    expect(getFavorites('member-002')).toEqual(['canvas-tote']);
  });

  it('favorites survive logout (tied to member id, not session)', () => {
    addFavorite('running-shoes');
    logout();
    expect(getFavorites('member-001')).toEqual(['running-shoes']);
  });
});

describe('favorites.ts / favorites:changeイベント', () => {
  beforeEach(() => {
    saveMember('member-001', 'member-001@example.com', {});
    login('member-001');
  });

  it('dispatches favorites:change with action "add"', () => {
    const handler = vi.fn();
    window.addEventListener('favorites:change', handler);
    addFavorite('running-shoes');
    window.removeEventListener('favorites:change', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail).toMatchObject({ memberId: 'member-001', action: 'add', slug: 'running-shoes' });
    expect(detail.favorites).toEqual(['running-shoes']);
  });

  it('dispatches favorites:change with action "remove"', () => {
    addFavorite('running-shoes');
    const handler = vi.fn();
    window.addEventListener('favorites:change', handler);
    removeFavorite('running-shoes');
    window.removeEventListener('favorites:change', handler);

    expect(handler.mock.calls[0][0].detail).toMatchObject({ action: 'remove', slug: 'running-shoes', favorites: [] });
  });
});

describe('favorites.ts / 複数タブ間同期', () => {
  it('re-dispatches favorites:change with action "sync" when a matching storage key changes from another tab', () => {
    const handler = vi.fn();
    window.addEventListener('favorites:change', handler);
    localStorage.setItem('astro-table:favorites:member-001', JSON.stringify(['running-shoes']));
    window.dispatchEvent(new StorageEvent('storage', { key: 'astro-table:favorites:member-001', newValue: '[]' }));
    window.removeEventListener('favorites:change', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ action: 'sync', memberId: 'member-001' });
  });

  it('ignores storage events for unrelated keys', () => {
    const handler = vi.fn();
    window.addEventListener('favorites:change', handler);
    window.dispatchEvent(new StorageEvent('storage', { key: 'some-other-app:setting' }));
    window.removeEventListener('favorites:change', handler);

    expect(handler).not.toHaveBeenCalled();
  });
});
