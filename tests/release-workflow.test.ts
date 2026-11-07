import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// GitHub Actionsに渡す実際のスクリプトを、GitHub APIとファイル読み込みを差し替えて検証する。
const workflow = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
const script = workflow.split('          script: |\n')[1].split('\n').map((line) => line.slice(12)).join('\n');
const publish = new Function(`return async function(github, context, core, require) {\n${script}\n}`)();
const notFound = () => Object.assign(new Error('Not found'), { status: 404 });

function setup(version = '0.1.0', notes = 'Migration notes') {
  const github = { rest: {
    repos: {
      getReleaseByTag: vi.fn().mockRejectedValue(notFound()),
      createRelease: vi.fn().mockResolvedValue({}),
    },
    git: { getRef: vi.fn().mockRejectedValue(notFound()) },
  } };
  const context = { repo: { owner: 'manji6', repo: 'astro-table' }, payload: { workflow_run: { head_sha: 'tested-main-sha' } } };
  const read = vi.fn((path: string) => path === 'package.json' ? JSON.stringify({ version }) : notes);
  const run = () => publish(github, context, { info: vi.fn() }, () => ({ readFileSync: read }));
  return { github, run, read };
}

describe('release workflow', () => {
  it('publishes the tested commit with the checked-in release notes', async () => {
    const { github, run, read } = setup();
    await run();
    expect(read).toHaveBeenCalledWith('releases/v0.1.0.md', 'utf8');
    expect(github.rest.repos.createRelease).toHaveBeenCalledWith({
      owner: 'manji6', repo: 'astro-table', tag_name: 'v0.1.0',
      target_commitish: 'tested-main-sha', name: 'AstroTable v0.1.0',
      body: 'Migration notes', draft: false, prerelease: false,
    });
  });
  it('leaves an existing release unchanged when CI runs again', async () => {
    const { github, run } = setup();
    github.rest.repos.getReleaseByTag.mockResolvedValue({});
    await run();
    expect(github.rest.git.getRef).not.toHaveBeenCalled();
    expect(github.rest.repos.createRelease).not.toHaveBeenCalled();
  });
  it('refuses to reuse a tag pointing to another commit', async () => {
    const { github, run } = setup();
    github.rest.git.getRef.mockResolvedValue({ data: { object: { type: 'commit', sha: 'another-sha' } } });
    await expect(run()).rejects.toThrow('refusing to move');
    expect(github.rest.repos.createRelease).not.toHaveBeenCalled();
  });
  it('can complete a release when its tag already points at the tested commit', async () => {
    const { github, run } = setup();
    github.rest.git.getRef.mockResolvedValue({ data: { object: { type: 'commit', sha: 'tested-main-sha' } } });
    await run();
    expect(github.rest.repos.createRelease).toHaveBeenCalledOnce();
  });
  it('propagates authentication failures instead of treating them as missing releases', async () => {
    const { github, run } = setup();
    github.rest.repos.getReleaseByTag.mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }));
    await expect(run()).rejects.toThrow('Forbidden');
    expect(github.rest.repos.createRelease).not.toHaveBeenCalled();
  });
  it('refuses invalid versions and empty or missing release notes', async () => {
    for (const version of ['0.1', '01.1.0', '0.1.0-beta.1']) {
      const { github, run } = setup(version);
      await expect(run()).rejects.toThrow('stable semantic version');
      expect(github.rest.repos.createRelease).not.toHaveBeenCalled();
    }
    const empty = setup('0.1.0', '  ');
    await expect(empty.run()).rejects.toThrow('empty');
    const missing = setup();
    missing.read.mockImplementation((path) => {
      if (path === 'package.json') return JSON.stringify({ version: '0.1.0' });
      throw new Error('ENOENT');
    });
    await expect(missing.run()).rejects.toThrow('ENOENT');
    expect(missing.github.rest.repos.createRelease).not.toHaveBeenCalled();
  });
});
