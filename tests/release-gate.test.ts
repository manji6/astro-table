import { describe, expect, it } from 'vitest';
import { evaluateReleaseGate, parseNameStatus } from '../scripts/check-release-gate.mjs';

interface Input {
  baseVersion: string;
  headVersion: string;
  changes: { status: string; path: string }[];
  notes: Record<string, string>;
  lock: { version?: string; rootVersion?: string };
}

function run(overrides: Partial<Input> = {}) {
  return evaluateReleaseGate({
    baseVersion: '0.1.0',
    headVersion: '0.1.0',
    changes: [],
    notes: {},
    lock: { version: '0.1.0', rootVersion: '0.1.0' },
    ...overrides,
  }) as { ok: boolean; errors: string[] };
}

const bumped = (v = '0.2.0'): Partial<Input> => ({
  headVersion: v,
  changes: [{ status: 'M', path: 'package.json' }, { status: 'A', path: `releases/v${v}.md` }],
  notes: { [`releases/v${v}.md`]: '# notes\n' },
  lock: { version: v, rootVersion: v },
});

describe('release-gate', () => {
  it('変更なしは合格', () => {
    expect(run({ changes: [{ status: 'M', path: 'src/a.ts' }] }).ok).toBe(true);
  });
  it('版上げ+ノートありは合格', () => {
    expect(run(bumped()).ok).toBe(true);
  });
  it('版上げのみは不合格', () => {
    const r = run({ ...bumped(), changes: [{ status: 'M', path: 'package.json' }] });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toContain('releases/v0.2.0.md');
  });
  it('ノート追加のみは不合格', () => {
    const r = run({ changes: [{ status: 'A', path: 'releases/v0.2.0.md' }], notes: { 'releases/v0.2.0.md': 'x' } });
    expect(r.ok).toBe(false);
  });
  it('別の版のノートが追加されていると不合格', () => {
    const b = bumped();
    const r = run({
      ...b,
      changes: [...(b.changes ?? []), { status: 'A', path: 'releases/v0.9.0.md' }],
      notes: { ...b.notes, 'releases/v0.9.0.md': 'x' },
    });
    expect(r.ok).toBe(false);
  });
  it('版が下がると不合格', () => {
    expect(run(bumped('0.0.9')).ok).toBe(false);
  });
  it('プレリリース版は不合格', () => {
    expect(run(bumped('0.2.0-beta.1')).ok).toBe(false);
  });
  it('lockの版不一致は不合格(トップレベル/packages配下それぞれ)', () => {
    expect(run({ ...bumped(), lock: { version: '0.1.0', rootVersion: '0.2.0' } }).ok).toBe(false);
    expect(run({ ...bumped(), lock: { version: '0.2.0', rootVersion: '0.1.0' } }).ok).toBe(false);
  });
  it('空のノートは不合格', () => {
    expect(run({ ...bumped(), notes: { 'releases/v0.2.0.md': '  \n' } }).ok).toBe(false);
  });
  it('name-statusをパースできる', () => {
    expect(parseNameStatus('M\tpackage.json\nA\treleases/v1.0.0.md\n')).toEqual([
      { status: 'M', path: 'package.json' },
      { status: 'A', path: 'releases/v1.0.0.md' },
    ]);
  });
});
