# Architecture

## What this is

`@behindthemusictree/app-kit` is a single published npm package (`packages/app-kit`) providing
shared, app-agnostic plumbing consumed by `grow-the-music-tree-frontend` and
`hear-the-music-tree-frontend`, so both apps run one implementation instead of two.
`apps/playground` is a local Vite harness for exercising exported components; it is not
published and has no runtime relationship to the package other than depending on it like any
other consumer.

```
app-kit/
├── packages/app-kit/     the published package — all logic lives here
│   ├── src/<module>/     one folder per subpath export (see below)
│   └── tsup.config.ts    entry map: keep in sync with src/*/index.ts and package.json "exports"
└── apps/playground/      manual Vite harness, not published
```

## Dependency direction

`packages/app-kit/src` must never import from `grow-the-music-tree-frontend` or
`hear-the-music-tree-frontend` — dependencies flow the other way. App-specific behavior (data
hooks, routes, popups) is injected into app-kit via props/callbacks instead:

- `PlayerProvider` takes a `loadTrack` loader rather than a hardcoded data hook.
- `AuthCallbackHandler` takes injected callback pathnames/handlers rather than hardcoded routes.
- `genre-tree` is scope-parameterized (`"me" | "reference"`) rather than assuming either
  consumer's scope.

Generic, stateless UI primitives (`Button`, `Input`, `Table`, ...) live upstream in
`@behindthemusictree/ui`, not here — this package consumes that library to build its
business-logic modules and should not grow new generic UI components of its own.

## Modules (subpath exports)

Each folder under `packages/app-kit/src/` is one npm subpath export
(`@behindthemusictree/app-kit/<module>`), with its own `index.ts` barrel, and is also
re-exported from the root barrel `src/index.ts`.

| Module | Path | Responsibility |
| --- | --- | --- |
| `transport` | `src/transport/` | Fetch wrapper (`useFetchWrapper`), React Query client setup, typed app-error hierarchy (`app-errors/`), subdomain base-URL builder (`site-urls.ts`) |
| `auth` | `src/auth/` | `SessionContext`/`SessionProvider`, OAuth code-exchange core, `AuthCallbackHandler`, logout |
| `popup` | `src/popup/` | `PopupContext`/`PopupProvider`, `BasePopup` chrome, and the concrete error/auth popups built on it |
| `player` | `src/player/` | `PlayerContext`, `MediaController`, playback state machine — generic over `PlayerTrack`, consumer supplies how to load a track |
| `genre-tree` | `src/genre-tree/` | Scope-parameterized D3 genre tree view (`GenreTreeView`), its data hooks (`useGenre`, `useGenrePlaylist`), and the upload/playlist/track-list engine (`playlist-tree/`, `track-list-sidebar/`, `TrackListContext`) |

Adding a module: export it from the module's own barrel **and** `src/index.ts`, then add a
matching entry to `tsup.config.ts` and the `exports` map in `packages/app-kit/package.json`.

## Cross-module coupling (why splitting is on)

Several subpaths share stateful singletons across entry points even though each is built as an
independent tsup entry:

- `auth`'s `SessionContext` is consumed internally by `transport`'s `useFetchWrapper` and by
  `genre-tree`'s data hooks.
- `player`'s `PlayerContext` is consumed by `genre-tree`'s `TrackListContext`/track-item
  components.

Without `splitting: true` on the ESM build, esbuild would bundle an independent copy of each
shared module — including a second `createContext()` call — into every entry file that imports
it. A consumer wrapping their tree with `<SessionProvider>` (from `auth`) and calling
`useFetchWrapper()` (from `transport`) would then see "must be used within a Provider" errors
despite doing everything right, because the two subpaths would hold different context instances.
`splitting: true` keeps one shared chunk per module so every entry point imports the same
instance. esbuild only supports splitting for ESM, so the build ships as two tsup passes: ESM
with splitting, CJS without — see `packages/app-kit/tsup.config.ts` for the full rationale and
the one known gap (a CJS consumer mixing subpath imports of the same shared context).

## Build & publish

- Build: `tsup` — one entry per module (`src/<module>/index.ts`) plus the root barrel, emitting
  ESM + CJS + `.d.ts` per entry into `dist/`.
- Registry: GitHub Packages (`https://npm.pkg.github.com`, scope `@behindthemusictree`).
- Release pipeline: `scripts/release.sh` (invoked as `pnpm release -- <bump>`) → git tag →
  `.github/workflows/publish.yml` builds and publishes on tag push. Never `npm publish` directly.
- Branching model: strict Gitflow — see `CONTRIBUTING.md` § Branching (Gitflow) and the
  "Branching" section of `CLAUDE.md`.
