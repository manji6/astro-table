import { describe, expect, it } from 'vitest';
import { parseExampleId, selectBlockLibraryItems, type RawExample } from '../src/lib/block-library-select';
import { parsePage } from '../src/lib/markdown/parse-page';

function example(name: string, locale: string | null, description = `${name} description`): RawExample {
  return { name, locale, description, category: 'general', source: name, tree: parsePage('') };
}

describe('parseExampleId', () => {
  it('parses the default (locale-independent) id', () => {
    expect(parseExampleId('quote/example')).toEqual({ name: 'quote', locale: null });
  });

  it('parses a locale-suffixed id (dots are stripped from content collection ids)', () => {
    expect(parseExampleId('quote/exampleen')).toEqual({ name: 'quote', locale: 'en' });
  });
});

describe('selectBlockLibraryItems / ロケールフォールバック', () => {
  it('uses example.md when no locale is requested', () => {
    const raw = [example('hero', null, 'ja版'), example('hero', 'en', 'en版')];
    const [item] = selectBlockLibraryItems(raw);
    expect(item.description).toBe('ja版');
  });

  it('prefers the locale-specific example when it exists', () => {
    const raw = [example('hero', null, 'ja版'), example('hero', 'en', 'en版')];
    const [item] = selectBlockLibraryItems(raw, 'en');
    expect(item.description).toBe('en版');
  });

  it('falls back to the default example when the requested locale has no override', () => {
    const raw = [example('hero', null, 'ja版')];
    const [item] = selectBlockLibraryItems(raw, 'en');
    expect(item.description).toBe('ja版');
  });

  it('throws when a Block has no default example.md (only a locale override exists)', () => {
    const raw = [example('hero', 'en', 'en版のみ')];
    expect(() => selectBlockLibraryItems(raw)).toThrow(/hero/);
  });

  it('sorts results by name', () => {
    const raw = [example('table', null), example('accordion', null)];
    const items = selectBlockLibraryItems(raw);
    expect(items.map((item) => item.name)).toEqual(['accordion', 'table']);
  });
});
