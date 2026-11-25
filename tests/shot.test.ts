import { describe, expect, it } from 'vitest';
import { pathToSlug } from '../scripts/shot.mjs';

describe('shot: pathToSlug', () => {
  it('ルートは home', () => {
    expect(pathToSlug('/')).toBe('home');
  });
  it('前後のスラッシュを取り、内側はハイフンにする', () => {
    expect(pathToSlug('/ja/example/')).toBe('ja-example');
    expect(pathToSlug('/ja/docs/blocks')).toBe('ja-docs-blocks');
  });
  it('クエリとハッシュは slug に含めない', () => {
    expect(pathToSlug('/ja/example/?a=1#top')).toBe('ja-example');
  });
  it('先頭スラッシュ無しでも同じ結果', () => {
    expect(pathToSlug('ja/example/')).toBe('ja-example');
  });
});
