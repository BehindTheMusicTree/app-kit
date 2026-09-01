## What this is

`@behindthemusictree/app-kit` — shared transport, auth, popup, UI, player, and genre-tree
plumbing consumed by `grow-the-music-tree-frontend` and `hear-the-music-tree-frontend`. Nothing
in `packages/app-kit/src` should import from either consuming app; all app-specific behavior
(data hooks, routes, popups) is passed in via props/callbacks.

## Stack

- TypeScript (strict), React — no framework of its own; consumers are Next.js apps
- Build: tsup (ESM + CJS + `.d.ts`) — multi-entry, one output per subpath
- Package manager: pnpm workspaces (`packages/app-kit`, `apps/playground`)
- Registry: GitHub Packages (`https://npm.pkg.github.com`, scope `@behindthemusictree`)

## Architecture

Full module map, cross-module coupling, and build rationale: `architecture.md`.

Docs (`architecture.md`, `README.md`, `CONTRIBUTING.md`, `CLAUDE.md` itself) describe the
current state of the repo only — no origin story, migration history, or "extracted from"/"used
to be" framing. History belongs in git log and `CHANGELOG.md`, not in reference docs.

## Critical paths

- `packages/app-kit/src/{transport,auth,popup,ui,player,genre-tree}/` — one folder per subpath
  export; each has its own `index.ts` barrel
- `packages/app-kit/src/index.ts` — root barrel re-exporting every module
- `packages/app-kit/tsup.config.ts` — entry map; keep in sync with `src/*/index.ts` and the
  `exports` field in `packages/app-kit/package.json`
- `apps/playground/` — manual Vite harness for exercising exported components; not published.
  Its backend proxy (`/api/grow-prototype-proxy`, `vite.config.ts`) only exists in Vite's dev
  server — the Vercel-hosted PR preview build has no equivalent, so preview builds 404 on that
  path and render with no real genre-tree data
- `scripts/release.sh` + `.github/workflows/publish.yml` — version bump → tag → publish pipeline
- `CHANGELOG.md` — update `[Unreleased]` for every user-facing change
- `pnpm-workspace.yaml` — catalog pin for `@behindthemusictree/genre-tree-view`, the separately
  published D3 tree component that `genre-tree`'s Wheel/Pop-Core views wrap; bump it here to pick
  up a new release of that package

## Conventions

- Adding a module: export it from the module's own barrel AND `src/index.ts`, then add a
  matching entry to `tsup.config.ts` and `packages/app-kit/package.json`'s `exports` map
- Keep modules decoupled from any one consumer: inject data loaders and callbacks (see
  `PlayerProvider`'s `loadTrack` prop and `AuthCallbackHandler`'s callback props) rather than
  importing a specific app's hooks or routes
- `genre-tree` is scope-parameterized (`"me" | "reference"`) — do not hardcode either scope's
  assumptions into shared components

## Branching (strict Gitflow)

- `main` — released code only, every commit tagged `vX.Y.Z`. Never branch from or PR into it
  directly; it only receives merges from `release/*` and `hotfix/*`.
- `develop` — GitHub default branch, integration branch for all in-progress work. Branch
  `feature/*`, `fix/*`, `chore/*` from here; PR back into here.
- `release/*` — cut from `develop` by `pnpm release -- <bump>` (`scripts/release.sh`), which also
  pushes it and opens PRs into both `main` and `develop`. After the `main` PR merges, run
  `pnpm tag-release` on `main` to tag and trigger the publish workflow.
- `hotfix/*` — cut from `main` for urgent production fixes; PR'd into both `main` and `develop`,
  tagged the same way via `pnpm tag-release` after the `main` PR merges.
- Full detail: `CONTRIBUTING.md` § Branching (Gitflow).

## Forbidden

- Importing anything from `grow-the-music-tree-frontend` or `hear-the-music-tree-frontend` —
  dependencies flow the other way
- Notable changes without a `CHANGELOG.md` entry under `[Unreleased]`
- Opening PRs against `main` from anything other than `release/*` or `hotfix/*` — target `develop`
  (see Branching above)
- Merging or pushing directly to `main` or `develop`, including from `release/*`/`hotfix/*` —
  always go through a PR, even with branch-protection bypass rights
- Publishing directly with `npm publish` — always go through `pnpm release -- <bump>`
  (`scripts/release.sh`) followed by `pnpm tag-release`, which also updates the changelog and
  lockfile
