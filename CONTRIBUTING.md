# 🧭 Contributing Guidelines

Thank you for your interest in contributing to `@behindthemusictree/app-kit`!

This package is consumed by `grow-the-music-tree-frontend` and `hear-the-music-tree-frontend`.
Changes here affect both apps, so please keep that blast radius in mind.

## Table of Contents

- [Contributors vs Maintainers](#contributors-vs-maintainers)
- [Development Workflow](#development-workflow)
  - [1. Fork \& Clone](#1-fork--clone)
  - [2. Environment Setup](#2-environment-setup)
  - [3. Branching](#3-branching)
  - [4. Developing](#4-developing)
  - [5. Verifying](#5-verifying)
  - [6. Committing](#6-committing)
  - [7. Pull Request Process](#7-pull-request-process)
  - [8. Releasing _(For Maintainers)_](#8-releasing-for-maintainers)
  - [9. Vercel Playground Env Sync _(For Maintainers)_](#9-vercel-playground-env-sync-for-maintainers)
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

### 3. Branching

Branch from `main`: `feature/<short-description>`, `fix/<short-description>`,
`chore/<short-description>`.

### 4. Developing

```bash
pnpm dev     # tsup --watch on packages/app-kit + apps/playground running in parallel
```

`apps/playground` is a small Vite app for manually exercising exported components — use it to
sanity-check UI changes before opening a PR.

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
2. Open a PR against `main` describing what changed and why.
3. Add a bullet to `CHANGELOG.md` under `[Unreleased]` for any user-facing change (new export,
   behavior change, breaking change).

### 8. Releasing _(For Maintainers)_

```bash
pnpm release -- patch   # or minor / major
```

This bumps `packages/app-kit/package.json`'s version, moves the `CHANGELOG.md` `[Unreleased]`
section under the new version heading, commits, tags (`vX.Y.Z`), and pushes — which triggers
`.github/workflows/publish.yml` to build and publish `@behindthemusictree/app-kit` to GitHub
Packages. Must be run from a clean `main` branch.

### 9. Vercel Playground Env Sync _(For Maintainers)_

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
