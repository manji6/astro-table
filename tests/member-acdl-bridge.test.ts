import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Member, MemberLoginDetail } from '../src/modules/member/lib/member';

function dispatchLogin(detail: MemberLoginDetail) {
  window.dispatchEvent(new CustomEvent('member:login', { detail }));
}

function dispatchLogout() {
  window.dispatchEvent(new CustomEvent('member:logout', { detail: { previousMemberId: 'member-001' } }));
}

// pushUser内部のハッシュ化(SHA-256, trim+lowercase正規化後)を、テスト側でも同じロジックで
// 再現して期待値を動的に算出する(マジックストリングのハードコードを避ける)。
async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// pushUserはメールアドレスのハッシュ化にcrypto.subtle.digest(非同期)を使うため、
// イベント発火からpushの実際の呼び出しまでにマイクロタスクを挟む。setTimeoutで
// マクロタスクの先頭まで進めることで、内部のawaitの深さに関わらず確実に完了を待つ。
async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
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
  await flushMicrotasks();
}

beforeEach(async () => {
  localStorage.clear();
  await loadBridge();
});

describe('member/acdl-bridge.ts / member:login・member:logout → ACDL push', () => {
  it('pushes the user namespace with id, attributes, email, and emailSha256 on member:login', async () => {
    dispatchLogin({ memberId: member.id, member });
    await flushMicrotasks();

    const emailSha256 = await sha256Hex(member.email.trim().toLowerCase());
    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({
      user: { id: 'member-001', plan: 'gold', region: 'jp', email: 'member-001@example.com', emailSha256 },
    });
  });

  it('hashes the email after trimming and lowercasing it', async () => {
    dispatchLogin({
      memberId: member.id,
      member: { ...member, email: '  Member-001@Example.com  ' },
    });
    await flushMicrotasks();

    const emailSha256 = await sha256Hex('member-001@example.com');
    const call = (window.adobeDataLayer.push as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0];
    expect(call.user.emailSha256).toBe(emailSha256);
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

    const emailSha256 = await sha256Hex('member-001@example.com');
    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({
      user: { id: 'member-001', plan: 'gold', email: 'member-001@example.com', emailSha256 },
    });
  });

  it('pushes user: null on load when nobody is logged in', () => {
    expect(window.adobeDataLayer.push).toHaveBeenCalledWith({ user: null });
  });
});
