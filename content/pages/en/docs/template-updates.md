---
title: "Pulling in Template Updates"
description: "Update sites created from AstroTable using versioned release tags"
pageType: "other"
---

# Pulling in Template Updates

A site created with “Use this template” has its own history. Read [GitHub Releases](https://github.com/manji6/astro-table/releases) before merging a specific release tag into a working branch in your site repository.

## Versions and release notes

The first release is `v0.1.0`. Releases use SemVer-style `vMAJOR.MINOR.PATCH` tags. During 0.x, breaking changes increment the minor version (0.1 → 0.2); compatible fixes increment the patch version (0.1.0 → 0.1.1). Starting with 1.0, breaking changes increment the major version.

Each release describes changes, breaking changes, migration steps, and files site owners should review. Published tags are never moved. Read the notes for every release up to your target, checking `Base.astro`, `site.config.ts`, dependencies, and any modules you deleted.

## Prepare your site repository

Commit local changes and start with a clean working tree. Version numbers below are examples: replace them with the published release you actually want.

```bash
git switch -c update/astro-table
# First time only. If upstream exists, check its URL with git remote -v
git remote add upstream https://github.com/manji6/astro-table.git
# Keep upstream tags separate from your site's own tags
git fetch upstream 'refs/tags/*:refs/remotes/upstream/tags/*'
```

## First time only: record the source version

Template-created sites share no ancestor with the template. **Only if your site was created from v0.1.0 and already includes all changes in that version**, connect the histories using:

```bash
git merge -s ours --allow-unrelated-histories upstream/tags/v0.1.0
```

`-s ours` changes no site files: it records every change up to that version as already integrated. Picking the newest tag without checking can permanently skip fixes in future merges. `-X ours` is a different option that favors your side only when resolving conflicts.

For sites created before release tags existed, use the original template commit if you know it. Replace the placeholder with its full SHA:

```bash
git fetch upstream <original-template-commit-SHA>
git merge -s ours --allow-unrelated-histories FETCH_HEAD
```

If the source commit is unknown or the site's baseline lacks changes from that version, use a normal initial merge and review the differences instead of recording them with `-s ours`:

```bash
git merge --no-commit --no-ff --allow-unrelated-histories upstream/tags/v0.1.0
```

This can produce many add/add conflicts. Review files and complete the validation below before committing. Forks and sites whose histories are already connected can skip this initial recording step.

## Subsequent updates: merge the target tag

After recording the original template version, merge updates normally. For example, to go from v0.1.0 to v0.2.0 (a hypothetical future release):

```bash
git fetch upstream 'refs/tags/*:refs/remotes/upstream/tags/*'
git merge --no-commit --no-ff upstream/tags/v0.2.0
```

To update from a pre-release source commit to the first release, target `upstream/tags/v0.1.0` instead.

## Resolve conflicts and validate

Review upstream changes while preserving your site's text, images, domain, tag IDs, and `storagePrefix`. `content/` and `public/` contain site-specific files; customized layouts and Blocks in the core can conflict too.

Sites that deleted commerce or demo content may encounter delete/modify conflicts. Use `git rm <file>` to keep an intentional deletion, or edit the file and use `git add <file>` to accept an integrated version. Check that imports or fixed routes for deleted modules have not been restored. Decide per file before applying ours/theirs options.

```bash
git status
# Resolve conflicts, using git add / git rm as appropriate
npm install
npm run lint
npm run typecheck
npm test
npm run build
# Also run npm run e2e for changes involving commerce/member behavior
# Review site configuration and build output before committing
git add package.json package-lock.json
git commit
```

Review dependency changes from `npm install` too. Open a PR in your site repository and merge after review. To abandon an in-progress merge, use `git merge --abort` (start with a clean tree).

List integrated versions with:

```bash
git for-each-ref --merged HEAD --format='%(refname:strip=4)' refs/remotes/upstream/tags/
```

Keeping the baseline and update merge commits lets future merges consider only unintegrated changes. The template's Release workflow is restricted to the upstream repository, so pulling it into a site does not automatically publish releases there.
