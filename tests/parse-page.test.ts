import { describe, expect, it } from 'vitest';
import { parsePage, type BlockNode } from '../src/lib/markdown/parse-page';

function firstBlock(markdown: string): BlockNode {
  const tree = parsePage(markdown);
  const block = tree.sections[0]?.children[0];
  if (!block || block.type !== 'block') throw new Error('expected a block node');
  return block;
}

describe('parsePage / セクション分割', () => {
  it('splits sections on thematic breaks and keeps prose as prose', () => {
    const tree = parsePage(['# Hello', '', 'World text.', '', '---', '', 'Second section.'].join('\n'));

    expect(tree.sections).toHaveLength(2);
    expect(tree.sections[0].children).toHaveLength(1);
    expect(tree.sections[0].children[0]).toMatchObject({ type: 'prose' });
    expect((tree.sections[0].children[0] as { html: string }).html).toContain('<h1>Hello</h1>');
  });

  it('mixes prose and block nodes within the same section in document order', () => {
    const markdown = [
      'Intro paragraph.',
      '',
      '| cards | | |',
      '| --- | --- | --- |',
      '| a | b | c |',
      '',
      'Outro paragraph.',
    ].join('\n');

    const tree = parsePage(markdown);
    const [section] = tree.sections;

    expect(section.children.map((child) => child.type)).toEqual(['prose', 'block', 'prose']);
  });

  it('handles prose with headings, lists and images alongside blocks (no crash, correct order)', () => {
    const markdown = [
      '## 見出し',
      '',
      '- 項目1',
      '- 項目2',
      '',
      '![alt](/hero.jpg)',
      '',
      '| hero | |',
      '| --- | --- |',
      '| title | 夏のキャンペーン |',
    ].join('\n');

    const tree = parsePage(markdown);
    const [section] = tree.sections;

    expect(section.children.map((child) => child.type)).toEqual(['prose', 'block']);
    const prose = section.children[0] as { html: string };
    expect(prose.html).toContain('<h2>見出し</h2>');
    expect(prose.html).toContain('<li>項目1</li>');
    expect(prose.html).toContain('<img src="/hero.jpg"');
  });

  // Buttons記法は「本文中の生HTMLをそのまま通す」という標準CommonMark機能で実現する
  // (Block固有の解釈をパース層に追加しない)。生HTMLがエスケープされず出力されることを確認する。
  it('passes raw inline HTML through prose untouched (Buttons notation)', () => {
    const markdown = [
      '新商品が入荷しました。<a href="/sale" class="button button--primary">セールを見る</a>ぜひ。',
    ].join('\n');

    const tree = parsePage(markdown);
    const prose = tree.sections[0].children[0] as { html: string };

    expect(prose.html).toContain('<a href="/sale" class="button button--primary">セールを見る</a>');
  });
});

describe('parsePage / list系Block(複数行・複数列)', () => {
  it('converts a GFM table with padded header into a BlockNode with multiple rows/columns', () => {
    const markdown = [
      '| cards | | |',
      '| --- | --- | --- |',
      '| ![shoes](/images/shoes.jpg) | Running Shoes | /products/shoes |',
      '| ![bag](/images/bag.jpg) | Tote Bag | /products/bag |',
    ].join('\n');

    const block = firstBlock(markdown);

    expect(block).toMatchObject({ type: 'block', name: 'cards', variants: [] });
    expect(block.rows).toHaveLength(2);
    expect(block.rows[0][0].images).toEqual([{ src: '/images/shoes.jpg', alt: 'shoes' }]);
    expect(block.rows[0][1].text).toBe('Running Shoes');
    expect(block.rows[1][1].text).toBe('Tote Bag');
  });
});

describe('parsePage / config系Block(2列key-value)', () => {
  it('parses a 2-column key-value table across multiple rows', () => {
    const markdown = [
      '| hero | |',
      '| --- | --- |',
      '| title | 夏のキャンペーン |',
      '| image | ![](/hero.jpg) |',
      '| cta | [詳しく見る](/campaign) |',
    ].join('\n');

    const block = firstBlock(markdown);

    expect(block.name).toBe('hero');
    expect(block.rows).toHaveLength(3);
    expect(block.rows[0]).toMatchObject([{ text: 'title' }, { text: '夏のキャンペーン' }]);
    expect(block.rows[1][1].images[0]).toMatchObject({ src: '/hero.jpg' });
    expect(block.rows[2][1].links[0]).toMatchObject({ href: '/campaign', text: '詳しく見る' });
  });
});

describe('parsePage / Cellのtext・images・links抽出', () => {
  it('extracts plain text from a text-only cell', () => {
    const block = firstBlock(['| cards | |', '| --- | --- |', '| plain text | more text |'].join('\n'));
    expect(block.rows[0][0]).toMatchObject({ text: 'plain text', images: [], links: [] });
  });

  it('extracts an image (src/alt) from an image-only cell', () => {
    const block = firstBlock(['| cards | |', '| --- | --- |', '| ![alt text](/a.jpg) | x |'].join('\n'));
    expect(block.rows[0][0].images).toEqual([{ src: '/a.jpg', alt: 'alt text' }]);
  });

  it('extracts a link (href/text) from a link-only cell', () => {
    const block = firstBlock(['| cards | |', '| --- | --- |', '| [Buy now](/buy) | x |'].join('\n'));
    expect(block.rows[0][0].links).toEqual([{ href: '/buy', text: 'Buy now' }]);
  });

  it('extracts both image and link when a cell contains a linked image', () => {
    const block = firstBlock(['| cards | |', '| --- | --- |', '| [![alt](/a.jpg)](/target) | x |'].join('\n'));
    expect(block.rows[0][0].images).toEqual([{ src: '/a.jpg', alt: 'alt' }]);
    // mdast-util-to-stringは画像のalt文字列をリンクのテキスト表現として使う
    expect(block.rows[0][0].links).toEqual([{ href: '/target', text: 'alt' }]);
  });

  it('keeps inline emphasis in the cell html', () => {
    const block = firstBlock(['| cards | |', '| --- | --- |', '| **strong** text | x |'].join('\n'));
    expect(block.rows[0][0].html).toContain('<strong>strong</strong>');
    expect(block.rows[0][0].text).toBe('strong text');
  });
});

describe('parsePage / Block名の正規化・variant記法', () => {
  it('normalizes casing and internal whitespace', () => {
    const block = firstBlock(['| Product Badge | |', '| --- | --- |', '| a | b |'].join('\n'));
    expect(block.name).toBe('product-badge');
  });

  it('trims surrounding whitespace in the header cell', () => {
    const block = firstBlock(['|   cards   | |', '| --- | --- |', '| a | b |'].join('\n'));
    expect(block.name).toBe('cards');
  });

  it('parses a single variant', () => {
    const block = firstBlock(['| cards (large) | |', '| --- | --- |', '| a | b |'].join('\n'));
    expect(block).toMatchObject({ name: 'cards', variants: ['large'] });
  });

  it('parses multiple comma-separated variants and normalizes name casing together', () => {
    const block = firstBlock(['| Cards (large, dark) | |', '| --- | --- |', '| a | b |'].join('\n'));
    expect(block).toMatchObject({ name: 'cards', variants: ['large', 'dark'] });
  });

  it('defaults to an empty variants array when there is no variant syntax', () => {
    const block = firstBlock(['| cards | |', '| --- | --- |', '| a | b |'].join('\n'));
    expect(block.variants).toEqual([]);
  });
});

describe('parsePage / 不正な表記のフォールバック挙動', () => {
  it('produces an empty block name when the header cell is empty (no silent "table" fallback; resolution/build error is the rendering layer\'s job per §3.5)', () => {
    const block = firstBlock(['|  | | |', '| --- | --- | --- |', '| a | b | c |'].join('\n'));
    expect(block.name).toBe('');
  });

  it('pads a body row that has fewer cells than the header with empty cells', () => {
    const block = firstBlock(['| cards | | |', '| --- | --- | --- |', '| only-one |'].join('\n'));
    expect(block.rows[0]).toHaveLength(3);
    expect(block.rows[0][0].text).toBe('only-one');
    expect(block.rows[0][1]).toMatchObject({ text: '', images: [], links: [] });
    expect(block.rows[0][2]).toMatchObject({ text: '', images: [], links: [] });
  });

  it('truncates a body row that has more cells than the header', () => {
    const block = firstBlock(['| cards | |', '| --- | --- |', '| a | b | extra-should-be-dropped |'].join('\n'));
    expect(block.rows[0]).toHaveLength(2);
    expect(block.rows[0].map((cell) => cell.text)).toEqual(['a', 'b']);
  });

  it('does not recognize a table at all when header/delimiter cell counts mismatch (GFM spec), falling back to plain prose', () => {
    // 01 §3.3: ヘッダー行はデリミタ行と同じ列数に空セルで揃える必要がある。揃っていない場合はGFM仕様上
    // 表として認識されず、ただのテキストとして扱われる(パース層が特別なフォールバック処理をするわけではない)。
    const markdown = ['| cards |', '| --- | --- | --- |', '| a | b | c |'].join('\n');
    const tree = parsePage(markdown);
    expect(tree.sections[0].children).toEqual([{ type: 'prose', html: expect.any(String) }]);
    expect(tree.sections[0].children[0].type).toBe('prose');
  });
});
