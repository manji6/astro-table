import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Member, MemberLoginDetail } from '../src/modules/member/lib/member';

function dispatchLogin(detail: MemberLoginDetail) {
  window.dispatchEvent(new CustomEvent('member:login', { detail }));
}

function dispatchLogout() {
  window.dispatchEvent(new CustomEvent('member:logout', { detail: { previousMemberId: 'member-001' } }));
}

const member: Member = {
  id: 'member-001',
  email: 'member-001@example.com',
  attributes: { plan: 'gold', region: 'jp' },
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

// acdl-bridge.tsはモジュール読み込み時点で現在のセッションをpushする副作用を持つため
// (下の別describe参照)、window.adobeDataLayerのモック設置後に都度動的importし直す。
async function loadBridge() {
  vi.resetModules();
  window.adobeDataLayer = { push: vi.fn() };
  await import('../src/modules/member/lib/acdl-bridge');
}

beforeEach(async () => {
  localStorage.clear();
  await loadBridge();
});

describe('member/acdl-bridge.ts / member:login・member:logout → ACDL push', () => {
  it('pushes the user namespace with id and attributes on member:login', () => {
    dispatchLogin({ memberId: member.id, member });

    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({
      user: { id: 'member-001', plan: 'gold', region: 'jp', email: 'member-001@example.com' },
    });
  });

  it('pushes user: null on member:logout', () => {
    dispatchLogout();

    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({ user: null });
  });
});

// window.adobeDataLayerはページ単位(フルページ遷移で消える)ため、event購読だけでは
// 「ログイン直後に別ページへ遷移した」ケースでuser状態が新しいページに反映されない
// (実ブラウザで発見した不具合)。モジュール読み込み時点で現在のセッションを
// 再pushすることで、pageコンテキストと同様にページ遷移をまたいで状態を維持する。
describe('member/acdl-bridge.ts / モジュール読み込み時の状態復元(ページ遷移対策)', () => {
  it('pushes the current user on load when a session already exists', async () => {
    const { saveMember, login } = await import('../src/modules/member/lib/member');
    saveMember('member-001', 'member-001@example.com', { plan: 'gold' });
    login('member-001');

    await loadBridge();

    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({
      user: { id: 'member-001', plan: 'gold', email: 'member-001@example.com' },
    });
  });

  it('pushes user: null on load when nobody is logged in', () => {
    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({ user: null });
  });
});
