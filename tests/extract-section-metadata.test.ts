import { describe, expect, it } from 'vitest';
import { parsePage } from '../src/lib/markdown/parse-page';
import { extractSectionMetadata } from '../src/lib/markdown/extract-section-metadata';

describe('extractSectionMetadata / section-metadata Blockの抽出', () => {
  it('section-metadata Blockのkey-valueペアを、そのセクションのmetadataとして抽出し、treeから取り除く', () => {
    const tree = parsePage(
      ['# 見出し', '', '本文テキスト。', '', '| section-metadata | |', '| --- | --- |', '| style | highlight |'].join(
        '\n',
      ),
    );

    const rest = extractSectionMetadata(tree);

    expect(rest.sections).toHaveLength(1);
    expect(rest.sections[0].metadata).toEqual({ style: 'highlight' });
    // section-metadata Blockはtreeから除去され、proseだけが残る
    expect(rest.sections[0].children).toEqual([{ type: 'prose', html: expect.stringContaining('見出し') }]);
  });

  it('section-metadataが無いセクションはmetadataフィールドを持たない', () => {
    const tree = parsePage(['| cards | |', '| --- | --- |', '| foo | bar |'].join('\n'));

    const rest = extractSectionMetadata(tree);

    expect(rest.sections[0].metadata).toBeUndefined();
    expect(rest.sections[0].children).toHaveLength(1);
  });

  it('複数セクションがある場合、section-metadataは置かれたセクションだけに適用される', () => {
    const tree = parsePage(
      [
        '| section-metadata | |',
        '| --- | --- |',
        '| style | highlight |',
        '',
        '## 1つ目',
        '',
        '---',
        '',
        '## 2つ目(metadataなし)',
      ].join('\n'),
    );

    const rest = extractSectionMetadata(tree);

    expect(rest.sections).toHaveLength(2);
    expect(rest.sections[0].metadata).toEqual({ style: 'highlight' });
    expect(rest.sections[1].metadata).toBeUndefined();
  });
});
