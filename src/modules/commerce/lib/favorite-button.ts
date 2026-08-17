// お気に入りボタンの共通クライアント側ロジック。PDP・カテゴリ一覧・検索結果の
// 3箇所で同じ「ログイン時のみ表示/クリックでトグル/状態に応じた表示切替」を行うための共有ヘルパー。
import { addFavorite, isFavorite, removeFavorite } from './favorites';
import { getCurrentMemberId } from '../../member/lib/member';

export interface FavoriteButtonLabels {
  add: string;
  remove: string;
}

export function renderFavoriteButton(button: HTMLButtonElement, slug: string, labels: FavoriteButtonLabels): void {
  const memberId = getCurrentMemberId();
  if (!memberId) {
    button.hidden = true;
    return;
  }
  button.hidden = false;
  const active = isFavorite(memberId, slug);
  button.textContent = active ? labels.remove : labels.add;
  button.setAttribute('aria-pressed', String(active));
  button.classList.toggle('is-active', active);
}

export function toggleFavorite(slug: string): void {
  const memberId = getCurrentMemberId();
  if (!memberId) return;
  if (isFavorite(memberId, slug)) removeFavorite(slug);
  else addFavorite(slug);
}
