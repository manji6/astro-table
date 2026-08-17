// ACDLパターンA: 中央集権ブリッジ。
// member.tsが発火する`member:login`/`member:logout`(ベンダー非依存)を購読し、
// `user`名前空間へのpushに変換する。member.ts自身はACDLの存在を一切知らない。
// commerceのacdl-bridge.tsと同じパターンだが、モジュールとしては独立している。

import { getCurrentMember, type Member, type MemberLoginDetail } from './member';

function pushUser(member: Member | null): void {
  if (member) {
    window.adobeDataLayer.push({ user: { id: member.id, ...member.attributes } });
  } else {
    window.adobeDataLayer.push({ user: null });
  }
}

function handleLogin(detail: MemberLoginDetail): void {
  pushUser(detail.member);
}

function handleLogout(): void {
  pushUser(null);
}

window.addEventListener('member:login', (event) => handleLogin(event.detail));
window.addEventListener('member:logout', () => handleLogout());

// window.adobeDataLayerはページ単位(フルページ遷移で消える)なので、`page`コンテキストと
// 同様に、そのページの読み込み時点で既にログイン中ならuser状態を再pushする。これが無いと、
// 「別ページに遷移した直後のログイン」(例: 会員発行ページのクイックスイッチ→/loginへ遷移)で、
// 遷移前のページでpushしたuser情報が新しいページのadobeDataLayerには反映されない。
pushUser(getCurrentMember());
