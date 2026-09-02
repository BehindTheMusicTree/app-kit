# 🧭 Contributing Guidelines

Thank you for your interest in contributing to `@behindthemusictree/app-kit`!

This package is consumed by `grow-the-music-tree-frontend` and `hear-the-music-tree-frontend`.
Changes here affect both apps, so please keep that blast radius in mind.

## Table of Contents

- [Contributors vs Maintainers](#contributors-vs-maintainers)
- [Development Workflow](#development-workflow)
  - [1. Fork \& Clone](#1-fork--clone)
  - [2. Environment Setup](#2-environment-setup)
  - [3. Branching (Gitflow)](#3-branching-gitflow)
  - [4. Developing](#4-developing)
  - [5. Verifying](#5-verifying)
  - [6. Committing](#6-committing)
  - [7. Pull Request Process](#7-pull-request-process)
  - [8. Releasing _(For Maintainers)_](#8-releasing-for-maintainers)
  - [9. Hotfixing _(For Maintainers)_](#9-hotfixing-for-maintainers)
  - [10. Vercel Playground Env Sync _(For Maintainers)_](#10-vercel-playground-env-sync-for-maintainers)
- [License \& Attribution](#license--attribution)

## Contributors vs Maintainers

**Contributors** can submit bug reports/feature requests via GitHub Issues, open pull requests,
improve documentation, and participate in discussions.

**Maintainers** review and merge pull requests, cut releases, and manage the publish workflow
(`.github/workflows/publish.yml`, which holds the `NPM_TOKEN` used to publish to GitHub
Packages).

## Development Workflow

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR-USERNAME/app-kit.git
cd app-kit
```

Maintainers can clone directly:

```bash
git clone https://github.com/BehindTheMusicTree/app-kit.git
cd app-kit
```

### 2. Environment Setup

Requirements:

- **Node.js 20.x or higher**
- **pnpm** (see `packageManager` in `package.json` for the pinned version)
- A GitHub personal access token with `read:packages` scope, configured for the
  `@behindthemusictree` scope against `https://npm.pkg.github.com` — required to install
  `@behindthemusictree/genre-tree-view`, a private dependency of this package.

```bash
pnpm install
```

### 3. Branching (Gitflow)

This repo follows strict [Gitflow](https://nvie.com/posts/a-successful-git-branching-model/):

- **`main`** — always reflects the latest released version. Every commit on `main` is tagged
  (`vX.Y.Z`). Nothing merges here except `release/*` and `hotfix/*` branches. This is also the
  GitHub default branch's *sibling of record* for releases, but PRs target `develop` by default.
- **`develop`** — integration branch, always reflects the latest delivered development changes.
  All `feature/*`, `fix/*`, and `chore/*` branches are cut from `develop` and merged back into
  `develop`. This is the GitHub default branch — PRs target it unless noted otherwise.
- **`feature/<short-description>`**, **`fix/<short-description>`**, **`chore/<short-description>`**
  — branch from `develop`, merge back into `develop` via PR.
- **`release/<version>`** — branched from `develop` when it's ready to ship (created
  automatically by `pnpm release`, see [§8](#8-releasing-for-maintainers)). Only version bump and
  changelog commits belong here. Merged into both `main` (tagged) and `develop`, then deleted.
- **`hotfix/<short-description>`** — branched from `main` for urgent production fixes that can't
  wait for the next `develop` → `release` cycle (see [§9](#9-hotfixing-for-maintainers)). Merged
  into both `main` (tagged) and `develop`, then deleted.

```
main       ──●───────────────●───────────────●──   (tags only: v1.0.0, v1.1.0, ...)
              \             / \             /
release/*      ●───●───●───●   \           /
              /             \   \         /
develop    ──●───●───●───●───●───●───●───●──
              \     /         \
feature/*      ●───●           ●  (fix/*, chore/*)
```

### 4. Developing

```bash
pnpm dev     # tsup --watch on packages/app-kit + apps/playground running in parallel
```

`apps/playground` is a small Vite app for manually exercising exported components — use it to
sanity-check UI changes before opening a PR.

Generic, stateless UI primitives (`Button`, `Input`, `Table`, ...) live in
[`@behindthemusictree/ui`](https://github.com/BehindTheMusicTree/ui), not in this package. This
package consumes `@behindthemusictree/ui` to build its business-logic modules (`popup`,
`genre-tree`, ...); it should not grow new generic UI components of its own.

When adding a new module, export it from both its own barrel (`src/<module>/index.ts`) and the
root barrel (`src/index.ts`), and add a matching subpath entry to `tsup.config.ts` and the
`exports` map in `packages/app-kit/package.json`.

### 5. Verifying

```bash
pnpm build   # tsup: ESM + CJS + .d.ts for every entry point
pnpm lint    # tsc --noEmit across the workspace
```

Both must pass before opening a PR. There is no test suite yet — until one exists, `pnpm build`
(which runs the DTS build) is the primary type-safety check.

### 6. Committing

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`,
`docs:`, `refactor:`) — the release script's changelog entries and the semver bump both key off
the change being clearly described.

### 7. Pull Request Process

1. Ensure `pnpm build && pnpm lint` pass locally.
2. Open a PR against `develop` describing what changed and why (never against `main` — see
   [§3](#3-branching-gitflow)).
3. Add a bullet to `CHANGELOG.md` under `[Unreleased]` for any user-facing change (new export,
   behavior change, breaking change).

### 8. Releasing _(For Maintainers)_

From a clean, up-to-date `develop`:

```bash
pnpm release -- patch   # or minor / major
```

This creates a `release/X.Y.Z` branch off `develop`, bumps `packages/app-kit/package.json`'s
version, moves the `CHANGELOG.md` `[Unreleased]` section under the new version heading, commits,
pushes the branch, and opens two PRs: `release/X.Y.Z` → `main` and `release/X.Y.Z` → `develop`.

Once the `main` PR is reviewed and merged, check out `main`, pull, and run:

```bash
pnpm tag-release
```

This tags the merge commit `vX.Y.Z` and pushes the tag, which triggers
`.github/workflows/publish.yml` to build and publish `@behindthemusictree/app-kit` to GitHub
Packages. Then merge the companion PR into `develop` (the release branch itself isn't deleted by
either merge, so both PRs stay valid regardless of merge order).

### 9. Hotfixing _(For Maintainers)_

For an urgent fix to what's already released, without pulling in unreleased `develop` work:

```bash
git checkout -b hotfix/<short-description> main
# fix, commit, add a CHANGELOG.md entry
```

Push the hotfix branch and open two PRs, same pattern as [§8](#8-releasing-for-maintainers):
`hotfix/<short-description>` → `main` and `hotfix/<short-description>` → `develop`. Once the
`main` PR merges, check out `main`, pull, and run `pnpm tag-release` (tag `vX.Y.Z` per
[semver](https://semver.org/) — typically a patch bump) to push the tag and trigger the publish
workflow, then merge the companion `develop` PR. There is no script to cut the hotfix branch
itself yet — create it with plain `git checkout -b`.

### 10. Vercel Playground Env Sync _(For Maintainers)_

`apps/playground` is deployed to Vercel for PR previews. Its `.npmrc` requires `NPM_TOKEN` to
install the private `@behindthemusictree/genre-tree-view` dependency from GitHub Packages —
without it, Vercel builds fail with `ERR_PNPM_TARBALL_URL_MISMATCH`. Because Vercel doesn't read
repo secrets directly, `NPM_TOKEN` is pushed into the Vercel project's env vars via
`.github/workflows/vercel-playground-env.yml` (`workflow_dispatch` only — not run automatically).

Configure once in the repo's GitHub settings:

| Name | Kind | Value |
| --- | --- | --- |
| `VERCEL_TOKEN` | Secret | Vercel token with env-write access to the `app-kit-playground` project |
| `GH_PACKAGES_TOKEN_READ` | Secret | GitHub Packages read token (same one `validate.yml` uses); synced to Vercel as `NPM_TOKEN` |
| `VERCEL_PROJECT_ID` | Variable | Vercel project id for `app-kit-playground` |
| `VERCEL_TEAM_ID` | Variable | Vercel team id (only if the project lives under a Vercel team) |

`VERCEL_TOKEN`'s value comes from a token created under Vercel → Account Settings → Tokens. Name
it `app-kit-playground-env-sync` there so it's identifiable (and revocable) among other tokens on
the account, then paste the value into the `VERCEL_TOKEN` GitHub secret above.

To (re-)sync after rotating any of the above: **Actions → "Sync playground env to Vercel" → Run
workflow**. Re-run or push a new commit to pick up the synced token on subsequent deployments.

## License & Attribution

By contributing, you agree your contributions are licensed under this repository's
[LICENSE](LICENSE).
