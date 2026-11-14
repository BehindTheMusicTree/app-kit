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
- [License \& Attribution](#license--attribution)

## Contributors vs Maintainers

**Contributors** can submit bug reports/feature requests via GitHub Issues, open pull requests,
improve documentation, and participate in discussions.

**Maintainers** review and merge pull requests, cut releases, and manage the publish workflow
(`.github/workflows/publish.yml`, which publishes both packages on npm through trusted publishing).

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

```bash
pnpm install
```

### 3. Branching (Gitflow)

This repo follows strict [Gitflow](https://nvie.com/posts/a-successful-git-branching-model/):

- **`main`** — always reflects the latest released version. CI tags validated version increases on `main`
  (`vX.Y.Z`). Nothing merges here except `release/*` and `hotfix/*` branches. This is also the
  GitHub default branch's *sibling of record* for releases, but PRs target `develop` by default.
- **`develop`** — integration branch, always reflects the latest delivered development changes.
  All `feature/*` branches are cut from `develop` and merged back into
  `develop`. This is the GitHub default branch — PRs target it unless noted otherwise.
- **`feature/<short-description>`** — any non-release, non-hotfix work (features, fixes,
  chores); branch from `develop`, merge back into `develop` via PR.
- **`release/<version>`** — branched from `develop` when it's ready to ship (created
  before running `pnpm release`, see [§8](#8-releasing-for-maintainers)). Only version bump and
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
feature/*      ●───●           ●
```

### 4. Developing

```bash
pnpm dev     # tsup --watch on packages/app-kit + apps/playground running in parallel
```

`apps/playground` is a small Vite app for manually exercising exported components — use it to
sanity-check UI changes before opening a PR.

Generic, stateless UI primitives (`Button`, `Input`, `Table`, ...) live in
[`@behindthemusictree/ui`](https://github.com/BehindTheMusicTree/ui), not in this package. This
package never imports it: `packages/app-kit` is headless, and only `packages/app-kit-ui` consumes
`@behindthemusictree/ui` to build the styled business components. Neither should grow new generic
UI components of its own.

When adding a new module, export it from both its own barrel (`src/<module>/index.ts`) and the
root barrel (`src/index.ts`), and add a matching subpath entry to `tsup.config.ts` and the
`exports` map in `packages/app-kit/package.json`.

### 5. Verifying

```bash
pnpm build   # tsup: ESM + CJS + .d.ts for every entry point
pnpm lint    # tsc --noEmit across the workspace, including browser tests
pnpm test    # Vitest suites with coverage thresholds
pnpm --filter app-kit-playground exec playwright install chromium  # first run
pnpm --filter app-kit-playground test:e2e
```

All checks must pass before opening a PR; CI runs them with Chromium installed.
Browser tests exercise the real playground at desktop and 390px mobile widths. API and image
requests use deterministic fixtures, so they need neither staging access nor an API key.
Each run starts its own Vite server on an allocated port and never reuses an existing server.
Failed browser tests save traces under `apps/playground/test-results/`; inspect one with
`pnpm --filter app-kit-playground exec playwright show-trace <trace.zip>`.

### 6. Committing

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`,
`docs:`, `refactor:`) — the release script's changelog entries and the semver bump both key off
the change being clearly described.

### 7. Pull Request Process

1. Ensure build, lint, unit/integration tests, and browser tests pass locally.
2. Open a PR against `develop` describing what changed and why (never against `main` — see
   [§3](#3-branching-gitflow)).
3. Add a bullet to `CHANGELOG.md` under `[Unreleased]` for any user-facing change (new export,
   behavior change, breaking change). Breaking changes (removed/renamed export, changed prop or
   function signature, dropped default) go under a `### Breaking` heading, not `### Changed`.

### 8. Releasing _(For Maintainers)_

Create a `release/*` branch from current `develop`, then run:

```bash
pnpm release patch   # or minor / major
```

Preparation requires a clean release or hotfix branch and non-empty Unreleased notes. It
updates both package versions, app-kit-ui's app-kit peer constraint, the lockfile and the dated
changelog section without committing, pushing or tagging. Review and commit those files,
push the branch and open a PR into `main`.

CI validates the merged commit, creates its annotated tag and triggers the existing
`publish.yml` OIDC workflow. The publisher validates the exact tag, main ancestry and release
notes, builds and packs both packages, then publishes app-kit before app-kit-ui. Each existing
npm version is skipped only if its SHA-512 integrity matches the packed artifact. The GitHub
Release is created after both packages succeed. Do not create or push release tags locally.
After publication, integrate `main` back into `develop` through a PR.

Activate the shared App credentials and tag rulesets separately once the contract reaches
`main`. Initial activation does not publish the existing version.

### 9. Hotfixing _(For Maintainers)_

Create `hotfix/*` from current `main`, commit the fix and add Unreleased notes. Run the same
preparation command on the clean hotfix branch, review and commit the prepared files, and open
a PR into `main`. CI owns tagging and publication; integrate `main` back into `develop` afterward.

## License & Attribution

By contributing, you agree your contributions are licensed under this repository's
[LICENSE](LICENSE).
