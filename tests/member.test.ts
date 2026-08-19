import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteMember,
  exportMembers,
  getCurrentMember,
  getCurrentMemberId,
  getMember,
  importMembers,
  listMembers,
  login,
  logout,
  saveMember,
} from '../src/modules/member/lib/member';

const EMAIL = 'member-001@example.com';

beforeEach(() => {
  localStorage.clear();
});

describe('member.ts / 会員データのCRUD', () => {
  it('listMembers returns an empty array when nothing is stored', () => {
    expect(listMembers()).toEqual([]);
  });

  it('saveMember creates a new member with the given email and attributes', () => {
    const member = saveMember('member-001', EMAIL, { plan: 'gold' });
    expect(member).toMatchObject({ id: 'member-001', email: EMAIL, attributes: { plan: 'gold' } });
    expect(listMembers()).toHaveLength(1);
  });

  it('saveMember updates an existing member instead of creating a duplicate', () => {
    saveMember('member-001', EMAIL, { plan: 'gold' });
    const updated = saveMember('member-001', EMAIL, { plan: 'platinum' });
    expect(updated.attributes).toEqual({ plan: 'platinum' });
    expect(listMembers()).toHaveLength(1);
  });

  it('getMember returns the matching member or undefined', () => {
    saveMember('member-001', EMAIL, { plan: 'gold' });
    expect(getMember('member-001')).toMatchObject({ id: 'member-001' });
    expect(getMember('unknown')).toBeUndefined();
  });

  it('deleteMember removes the member by id', () => {
    saveMember('member-001', EMAIL, { plan: 'gold' });
    deleteMember('member-001');
    expect(listMembers()).toHaveLength(0);
  });

  it('trims whitespace from the id', () => {
    saveMember('  member-001  ', EMAIL, { plan: 'gold' });
    expect(getMember('member-001')).toBeDefined();
  });

  it('throws when saving an empty id', () => {
    expect(() => saveMember('   ', EMAIL, {})).toThrow();
  });

  it('throws when saving without a valid email', () => {
    expect(() => saveMember('member-001', '', {})).toThrow();
    expect(() => saveMember('member-001', 'not-an-email', {})).toThrow();
  });

  it('trims whitespace from the email', () => {
    const member = saveMember('member-001', `  ${EMAIL}  `, {});
    expect(member.email).toBe(EMAIL);
  });
});

describe('member.ts / ログイン・ログアウト', () => {
  it('getCurrentMemberId returns null when nobody is logged in', () => {
    expect(getCurrentMemberId()).toBeNull();
    expect(getCurrentMember()).toBeNull();
  });

  it('login succeeds for a registered member id and persists the session', () => {
    saveMember('member-001', EMAIL, { plan: 'gold' });
    const member = login('member-001');
    expect(member).toMatchObject({ id: 'member-001' });
    expect(getCurrentMemberId()).toBe('member-001');
    expect(getCurrentMember()).toMatchObject({ id: 'member-001' });
  });

  it('login returns null for an unregistered member id (does not log in)', () => {
    const result = login('unknown');
    expect(result).toBeNull();
    expect(getCurrentMemberId()).toBeNull();
  });

  it('logout clears the current session', () => {
    saveMember('member-001', EMAIL, {});
    login('member-001');
    logout();
    expect(getCurrentMemberId()).toBeNull();
  });

  it('deleting the currently logged-in member also logs them out', () => {
    saveMember('member-001', EMAIL, {});
    login('member-001');
    deleteMember('member-001');
    expect(getCurrentMemberId()).toBeNull();
  });
});

describe('member.ts / Export・Import', () => {
  it('exportMembers serializes the full roster as JSON', () => {
    saveMember('member-001', EMAIL, { plan: 'gold' });
    saveMember('member-002', 'member-002@example.com', { plan: 'silver' });
    const json = JSON.parse(exportMembers());
    expect(json).toHaveLength(2);
  });

  it('importMembers replaces the roster with the imported data', () => {
    saveMember('member-999', EMAIL, {});
    const json = JSON.stringify([{ id: 'member-001', email: EMAIL, attributes: { plan: 'gold' } }]);
    importMembers(json);
    expect(listMembers().map((m) => m.id)).toEqual(['member-001']);
  });

  it('round-trips through export/import', () => {
    saveMember('member-001', EMAIL, { plan: 'gold', region: 'jp' });
    const json = exportMembers();
    localStorage.clear();
    importMembers(json);
    expect(getMember('member-001')).toMatchObject({ email: EMAIL, attributes: { plan: 'gold', region: 'jp' } });
  });

  it('throws on malformed import data', () => {
    expect(() => importMembers('not json')).toThrow();
    expect(() => importMembers('{}')).toThrow();
  });

  it('throws when an imported member is missing a valid email', () => {
    const json = JSON.stringify([{ id: 'member-001', attributes: {} }]);
    expect(() => importMembers(json)).toThrow();

    const invalidEmailJson = JSON.stringify([{ id: 'member-001', email: 'not-an-email', attributes: {} }]);
    expect(() => importMembers(invalidEmailJson)).toThrow();
  });
});

describe('member.ts / イベント発火', () => {
  it('dispatches member:change with action "create" on saveMember (new)', () => {
    const handler = vi.fn();
    window.addEventListener('member:change', handler);
    saveMember('member-001', EMAIL, {});
    window.removeEventListener('member:change', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ action: 'create' });
  });

  it('dispatches member:change with action "update" on saveMember (existing)', () => {
    saveMember('member-001', EMAIL, {});
    const handler = vi.fn();
    window.addEventListener('member:change', handler);
    saveMember('member-001', EMAIL, { plan: 'gold' });
    window.removeEventListener('member:change', handler);

    expect(handler.mock.calls[0][0].detail).toMatchObject({ action: 'update' });
  });

  it('dispatches member:change with action "delete" on deleteMember', () => {
    saveMember('member-001', EMAIL, {});
    const handler = vi.fn();
    window.addEventListener('member:change', handler);
    deleteMember('member-001');
    window.removeEventListener('member:change', handler);

    expect(handler.mock.calls[0][0].detail).toMatchObject({ action: 'delete' });
  });

  it('dispatches member:login with the member on successful login', () => {
    saveMember('member-001', EMAIL, { plan: 'gold' });
    const handler = vi.fn();
    window.addEventListener('member:login', handler);
    login('member-001');
    window.removeEventListener('member:login', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ memberId: 'member-001' });
  });

  it('does not dispatch member:login when login fails', () => {
    const handler = vi.fn();
    window.addEventListener('member:login', handler);
    login('unknown');
    window.removeEventListener('member:login', handler);

    expect(handler).not.toHaveBeenCalled();
  });

  it('dispatches member:logout on logout', () => {
    saveMember('member-001', EMAIL, {});
    login('member-001');
    const handler = vi.fn();
    window.addEventListener('member:logout', handler);
    logout();
    window.removeEventListener('member:logout', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ previousMemberId: 'member-001' });
  });
});

describe('member.ts / 複数タブ間同期', () => {
  it('re-dispatches member:change with action "sync" when the roster key changes from another tab', () => {
    const handler = vi.fn();
    window.addEventListener('member:change', handler);
    window.dispatchEvent(new StorageEvent('storage', { key: 'astro-table:member:roster', newValue: '{}' }));
    window.removeEventListener('member:change', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ action: 'sync' });
  });

  it('re-dispatches member:login when the session key changes to a known member id from another tab', () => {
    saveMember('member-001', EMAIL, { plan: 'gold' });
    localStorage.setItem('astro-table:member:session', 'member-001');
    const handler = vi.fn();
    window.addEventListener('member:login', handler);
    window.dispatchEvent(new StorageEvent('storage', { key: 'astro-table:member:session', newValue: 'member-001' }));
    window.removeEventListener('member:login', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ memberId: 'member-001' });
  });

  it('re-dispatches member:logout when the session key is cleared from another tab', () => {
    const handler = vi.fn();
    window.addEventListener('member:logout', handler);
    window.dispatchEvent(new StorageEvent('storage', { key: 'astro-table:member:session', newValue: null }));
    window.removeEventListener('member:logout', handler);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores storage events for unrelated keys', () => {
    const changeHandler = vi.fn();
    const loginHandler = vi.fn();
    window.addEventListener('member:change', changeHandler);
    window.addEventListener('member:login', loginHandler);
    window.dispatchEvent(new StorageEvent('storage', { key: 'some-other-app:setting' }));
    window.removeEventListener('member:change', changeHandler);
    window.removeEventListener('member:login', loginHandler);

    expect(changeHandler).not.toHaveBeenCalled();
    expect(loginHandler).not.toHaveBeenCalled();
  });
});
