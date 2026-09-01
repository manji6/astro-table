// ACDLパターンA: 中央集権ブリッジ。
// member.tsが発火する`member:login`/`member:logout`(ベンダー非依存)を購読し、
// `user`名前空間へのpushに変換する。member.ts自身はACDLの存在を一切知らない。
// commerceのacdl-bridge.tsと同じパターンだが、モジュールとしては独立している。

import { getCurrentMember, type Member, type MemberLoginDetail } from './member';

// マーケティングツール側では、生のメールアドレスを扱えないケース(サーバーサイド連携先が
// ハッシュ化済み値しか受け付けない等)があるため、SHA-256ハッシュ値も併せてpushする。
// 大文字小文字・前後空白の差でハッシュ値が変わらないよう、正規化してからハッシュ化する
// (主要広告/計測プラットフォームのメールハッシュ化規約と同じ考え方)。
async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// userのpushには2種類の意味がある。「ログイン/ログアウトという操作が実際に起きた」ことを示す
// 操作ログ(user_login/user_logout)と、「identity情報がdataLayerにセットされた」ことを示す
// 状態セット通知(set_identity)。ページ遷移時の状態復元(下記)は実際のログイン操作ではないため、
// set_identityのみ発火しuser_loginは出さない。ログアウトはidentityをクリアするだけなので
// set_identityは出さない。
async function pushUserSet(member: Member, events: string[]): Promise<void> {
  const emailSha256 = await sha256Hex(member.email.trim().toLowerCase());
  const user = { id: member.id, ...member.attributes, email: member.email, emailSha256 };
  for (const event of events) {
    window.adobeDataLayer.push({ event, user });
  }
}

function pushUserCleared(event?: string): void {
  window.adobeDataLayer.push(event ? { event, user: null } : { user: null });
}

function handleLogin(detail: MemberLoginDetail): void {
  void pushUserSet(detail.member, ['user_login', 'set_identity']);
}

function handleLogout(): void {
  pushUserCleared('user_logout');
}

// window.adobeDataLayerはページ単位(フルページ遷移で消える)なので、`page`コンテキストと
// 同様に、そのページの読み込み時点で既にログイン中ならuser状態を再pushする。これが無いと、
// 「別ページに遷移した直後のログイン」(例: 会員発行ページのクイックスイッチ→/loginへ遷移)で、
// 遷移前のページでpushしたuser情報が新しいページのadobeDataLayerには反映されない。
window.addEventListener('member:login', (event) => handleLogin(event.detail));
window.addEventListener('member:logout', () => handleLogout());

const restoredMember = getCurrentMember();
if (restoredMember) {
  void pushUserSet(restoredMember, ['set_identity']);
} else {
  pushUserCleared();
}
