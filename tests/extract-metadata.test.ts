import { describe, expect, it } from 'vitest';
import { parsePage } from '../src/lib/markdown/parse-page';
import { extractMetadata } from '../src/lib/markdown/extract-metadata';

describe('extractMetadata / metadata Blockの抽出', () => {
  it('metadata Blockのkey-valueペアを抽出し、treeから取り除く', () => {
    const tree = parsePage(
      [
        '# 見出し',
        '',
        '本文テキスト。',
        '',
        '| metadata | |',
        '| --- | --- |',
        '| og:type | article |',
        '| twitter:card | summary_large_image |',
        '| author | 山田太郎 |',
      ].join('\n'),
    );

    const { metadata, tree: rest } = extractMetadata(tree);

    expect(metadata).toEqual([
      { name: 'og:type', value: 'article' },
      { name: 'twitter:card', value: 'summary_large_image' },
      { name: 'author', value: '山田太郎' },
    ]);

    // metadata Blockはtreeから除去され、proseだけが残る
    expect(rest.sections).toHaveLength(1);
    expect(rest.sections[0].children).toEqual([{ type: 'prose', html: expect.stringContaining('見出し') }]);
  });

  it('metadata Blockが無い場合は空配列を返し、treeはそのまま', () => {
    const tree = parsePage(['| cards | |', '| --- | --- |', '| foo | bar |'].join('\n'));

    const { metadata, tree: rest } = extractMetadata(tree);

    expect(metadata).toEqual([]);
    expect(rest).toEqual(tree);
  });

  it('metadata Blockだけのセクションは除去される(空セクションを残さない)', () => {
    const tree = parsePage(
      ['| cards | |', '| --- | --- |', '| foo | bar |', '', '---', '', '| metadata | |', '| --- | --- |', '| a | b |'].join(
        '\n',
      ),
    );

    const { metadata, tree: rest } = extractMetadata(tree);

    expect(metadata).toEqual([{ name: 'a', value: 'b' }]);
    expect(rest.sections).toHaveLength(1);
    expect(rest.sections[0].children[0]).toMatchObject({ type: 'block', name: 'cards' });
  });
});
