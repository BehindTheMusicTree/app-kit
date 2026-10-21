# Architecture

## What this is

Two lockstep-versioned packages consumed by `grow-the-music-tree-frontend` and
`hear-the-music-tree-frontend`, so both apps run one implementation:

- `@behindthemusictree/app-kit` (`packages/app-kit`) — headless logic: no styling, no Tailwind.
- `@behindthemusictree/app-kit-ui` (`packages/app-kit-ui`) — styled components built only on
  app-kit's public subpaths.

`apps/playground` is a local Vite harness for exercising both; it is not published.

```
app-kit/
├── packages/app-kit/      headless logic and hooks
│   ├── src/<module>/      one folder per subpath export (see below)
│   ├── scripts/check-headless.mjs   lint guard: forbids UI/styling imports in src
│   └── tsup.config.ts     entry map: keep in sync with src/*/index.ts and package.json "exports"
├── packages/app-kit-ui/   styled components: popup, auth, genre-tree subpaths
└── apps/playground/       manual Vite harness, not published
```

## Dependency direction

`packages/app-kit/src` must never import from `grow-the-music-tree-frontend` or
`hear-the-music-tree-frontend` — dependencies flow the other way. App-specific behavior (data
hooks, routes, popups) is injected into app-kit via props/callbacks instead:

- `PlayerProvider` takes a `loadTrack` loader rather than a hardcoded data hook.
- `AuthCallbackHandler` takes injected callback pathnames/handlers rather than hardcoded routes.
- `genre-tree` is scope-parameterized (`"me" | "reference"`) rather than assuming either
  consumer's scope.

`packages/app-kit/src` is headless: it must not import `@behindthemusictree/ui`, `app-kit-ui`,
`genre-tree-view`, `lucide-react`, `react-icons`, `clsx` or `tailwind-merge` (enforced by
`scripts/check-headless.mjs`, run by `pnpm lint`). Anything with markup or classes belongs in
`app-kit-ui`, driven by a hook from app-kit. Generic primitives (`Button`, `Input`, `Table`, ...)
live in `@behindthemusictree/ui`, which only `app-kit-ui` consumes.

`app-kit-ui` imports app-kit through its published subpaths and declares it as a peer, so the
Session, Player and Popup contexts exist once per app. Colors come from the CSS variables
documented in its README.

## Modules (subpath exports)

Each folder under `packages/app-kit/src/` is one npm subpath export
(`@behindthemusictree/app-kit/<module>`), with its own `index.ts` barrel, and is also
re-exported from the root barrel `src/index.ts`.

| Module | Path | Responsibility |
| --- | --- | --- |
| `transport` | `src/transport/` | Fetch wrapper (`useFetchWrapper`), React Query client setup, typed app-error hierarchy (`app-errors/`), subdomain base-URL builder (`site-urls.ts`) |
| `auth` | `src/auth/` | `SessionContext`/`SessionProvider`, OAuth code-exchange core, `useAuthCallback`, logout |
| `popup` | `src/popup/` | `PopupContext`/`PopupProvider`, `usePopup`, `useConnectivityErrorPopup`, `useTrackUpload` |
| `player` | `src/player/` | `PlayerContext`, `MediaController`, playback state machine — generic over `PlayerTrack`, consumer supplies how to load a track |
| `genre-tree` | `src/genre-tree/` | Schemas, data hooks (`useGenre`, `useGenrePlaylist`), `useGenreTreeViewState`, `useGenreSearch`, `TrackListContext` |

`genre-tree` never knows a consumer's routes: artist names in track lists (`TrackItem`,
`TrackListSidebar`, the genre detail panel via `GenreTreeView`, all in `app-kit-ui`) become links only when the
consumer passes `renderArtistLink(artist)`, which returns its own router link so navigation stays
client-side and playback keeps running. `useTrackList().playNewTrackListFromArtist(artist, scope,
{ ordering, startRecordingUuid? })` queues an artist's playable recordings (`library/recordings/?artist=&playable=true`),
paging lazily through `loadMore` like the genre-playlist origin.

Adding a module: export it from the module's own barrel **and** `src/index.ts`, then add a
matching entry to `tsup.config.ts` and the `exports` map in `packages/app-kit/package.json`.

`app-kit-ui`'s Wheel and Pop/Core rendering (`GenreTreeWheelRadial`, `GenreTreeWheelRadialPopCore`)
is built on `@behindthemusictree/genre-tree-view`, a separately published, presentational D3 tree
component maintained in its own repo. Its version is pinned once in the `pnpm-workspace.yaml`
catalog and consumed by `app-kit-ui` as `catalog:` — bump it there (not per-package) to pick up releases.

## Cross-module coupling (why splitting is on)

Several subpaths share stateful singletons across entry points even though each is built as an
independent tsup entry:

- `auth`'s `SessionContext` is consumed internally by `transport`'s `useFetchWrapper` and by
  `genre-tree`'s data hooks.
- `player`'s `PlayerContext` is consumed by `genre-tree`'s `TrackListContext`.

Without `splitting: true` on the ESM build, esbuild would bundle an independent copy of each
shared module — including a second `createContext()` call — into every entry file that imports
it. A consumer wrapping their tree with `<SessionProvider>` (from `auth`) and calling
`useFetchWrapper()` (from `transport`) would then see "must be used within a Provider" errors
despite doing everything right, because the two subpaths would hold different context instances.
`splitting: true` keeps one shared chunk per module so every entry point imports the same
instance. esbuild only supports splitting for ESM, so the build ships as two tsup passes: ESM
with splitting, CJS without — see `packages/app-kit/tsup.config.ts` (`app-kit-ui` uses the same two passes) for the full rationale and
the one known gap (a CJS consumer mixing subpath imports of the same shared context).

## Build & publish

- Build: `tsup` (per package; `app-kit-ui` also copies the genre-tree-view stylesheet) — one entry per module (`src/<module>/index.ts`) plus the root barrel, emitting
  ESM + CJS + `.d.ts` per entry into `dist/`.
- Registry: GitHub Packages (`https://npm.pkg.github.com`, scope `@behindthemusictree`).
- Release pipeline: `scripts/release.sh` (invoked as `pnpm release <bump>`) → git tag →
  `.github/workflows/publish.yml` builds and publishes app-kit, then app-kit-ui, on tag push. `release.sh` sets both versions and app-kit-ui's peer on app-kit to `^X.Y.Z`. Never `npm publish` directly.
- Branching model: strict Gitflow — see `CONTRIBUTING.md` § Branching (Gitflow) and the
  "Branching" section of `CLAUDE.md`.
