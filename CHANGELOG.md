# Changelog

All notable changes to `@behindthemusictree/app-kit` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.10] - 2026-08-11

### Added

- `.github/skills/code-review/SKILL.md` — GitHub Copilot code review agent skill encoding this
  repo's decoupling, export-wiring, and changelog rules (per
  [GitHub's Agent Skills for code review](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review#mcp-servers-and-agent-skills)).

### Changed

- `GenreTreeSkeleton` now renders 6 levels deep (root through 5 descendant levels, node counts
  `[1, 6, 13, 15, 20, 25]`) instead of the previous 3-level root/child/leaf layout, so the loading
  state better matches how deep a real genre tree can run.
- `GenreTreeView`'s "Load the example/reference tree genre" button is now hidden while the tree is
  loading or once at least one genre already exists, instead of just being disabled — it only made
  sense as an empty-state action.

## [0.1.9] - 2026-08-10

### Changed

- `GenreTreeSkeleton` now renders a horizontal SVG tree (rounded cards, curved connectors, root
  accent dot) that visually approximates the real `GenreTree`'s card-based layout, replacing the
  previous dark, vertically-indented avatar+bar list which looked nothing like the tree it
  precedes. A masked gradient sweeps across the cards and connectors on a loop (the standard
  shimmer pattern used by content-loader-style skeletons), replacing the flat `animate-pulse`
  fade so the loading state reads clearly as "in progress" rather than a static illustration.
  Disabled under `prefers-reduced-motion: reduce`.

## [0.1.8] - 2026-08-10

### Fixed

- `apps/playground` now always calls `hear-api-staging.themusictree.org`, regardless of
  `VITE_VERCEL_ENV`. Playground has no stable Vercel domain, so a "Production" deploy was
  targeting prod `hear-api`, whose CORS allowlist only carries the real prod frontends — the
  playground's wildcard Vercel-preview origin was never whitelisted there (only on staging),
  so every request was blocked by CORS.

## [0.1.7] - 2026-08-10

### Fixed

- `parseWithLog` now throws a clear `"received null response before schema validation"` error
  when handed a `null`/`undefined` response instead of running it through `schema.safeParse`,
  which previously produced a confusing `{ fieldErrors: {}, formErrors: ['Expected object,
  received null'] }` zod-flatten log. `fetchWrapper` legitimately returns `null` when auth isn't
  ready yet or a connectivity/backend error is handled globally, and several consumers (e.g.
  `useFetchGenre`, `useFetchGenrePlaylistDetailed`, `useQueryWithParse`) fed that straight into a
  root `z.object` schema with no guard.

## [0.1.6] - 2026-08-08

### Fixed

- Broke a circular dependency in `PlayerProvider` between `onTrackEnd` state and
  `loadTrackForPlayer`: `loadTrackForPlayer` depended on `onTrackEnd`, and grow's `AutoAdvance`
  effect called `setOnTrackEnd` with a fresh closure every time `handleNextTrack` (derived from
  `loadTrackForPlayer`) changed identity, producing an unconditional infinite render loop from
  page load — unlike the 0.1.2-0.1.5 fixes, this wasn't an unmemoized-context-value bug, but two
  otherwise-correct dependency arrays forming an actual cycle. Fixed by reading `onTrackEnd` via a
  ref inside the `ended` event listener instead of listing it as a `loadTrackForPlayer` dependency.

## [0.1.5] - 2026-08-08

### Fixed

- Memoized `ConnectivityErrorProvider`'s context value and its `setConnectivityError`/
  `clearConnectivityError` handlers — same unmemoized-context bug as `PopupProvider` (0.1.2),
  `TrackListProvider`/`TrackListSidebarVisibilityProvider` (0.1.3), and `SessionProvider` (0.1.4).
  `setConnectivityError`'s instability is a dependency of `useFetchWrapper`'s `fetch`, so it
  cascaded through `loadTrack`/`loadTrackForPlayer` into every `usePlayer()`/`useTrackList()`
  consumer, and ultimately into `genre-tree-view`'s tree-rebuilding effect, reproducing the same
  toolbar hover flicker even after the 0.1.2, 0.1.3, and 0.1.4 fixes.

## [0.1.4] - 2026-08-07

### Fixed

- Memoized `SessionProvider`'s context value and its `setSession`/`clearSession` handlers — same
  unmemoized-context bug as `PopupProvider` (0.1.2) and `TrackListProvider`/
  `TrackListSidebarVisibilityProvider` (0.1.3). `clearSession`'s instability cascaded through
  `useFetchWrapper`'s `fetch` (a dependency of nearly every data-fetching hook in this package),
  through `loadTrack`/`loadTrackForPlayer`, into `TrackListProvider`'s handlers despite those
  already being memoized, and ultimately into `genre-tree-view`'s tree-rebuilding effect —
  reproducing the same toolbar hover flicker even after the 0.1.2 and 0.1.3 fixes.

## [0.1.3] - 2026-08-07

### Fixed

- Memoized `TrackListProvider`'s context value and its `toTrackAtPosition`/
  `playNewTrackListFromUploadedTrackUuid`/`playNewTrackListFromGenrePlaylist` handlers, and
  `TrackListSidebarVisibilityProvider`'s context value and its `toggleTrackListSidebar`/
  `showTrackListSidebar`/`hideTrackListSidebar` handlers — same unmemoized-context bug as
  `PopupProvider` (see 0.1.2), left unfixed here and still causing the toolbar hover flicker via
  `genre-tree-view`'s tree-rebuilding effect.

## [0.1.2] - 2026-08-07

### Fixed

- Memoized `PopupProvider`'s context value and `showPopup`/`hidePopup` handlers, which were being
  recreated on every render. This broke memoization for any consumer, causing downstream effects
  (e.g. `genre-tree-view`'s tree-rebuilding effect) to rerun on unrelated re-renders and produce a
  toolbar show/hide flicker on hover.

### Added

- Vitest + `@vitest/coverage-v8` test infrastructure for `packages/app-kit`, with an 80% coverage
  threshold scoped to files exercised by tests, wired into `turbo run test` and CI.

### Removed

- Removed the large root genre name heading rendered behind each tree in `GenreTreeView`.

## [0.1.1] - 2026-08-06

### Changed

- Bumped `@behindthemusictree/genre-tree-view` dependency from `0.1.0` to `0.3.0`.

## [0.1.0] - 2026-08-04

### Added

- Initial extraction of shared transport, auth, popup, UI, player, and genre-tree plumbing out of
  `grow-the-music-tree-frontend` into a standalone package: `transport` (fetch wrapper, query
  client, app-error types, subdomain base-URL builder), `auth` (session context, code-exchange
  core, logout, callback handler), `popup` (popup context, base popup chrome), `ui` (Table,
  Skeleton, Input, Button, Pagination, RingLoader, upload popup/buttons), `player` (generic
  `PlayerTrack`-based playback context), `genre-tree` (scope-parameterized D3 genre tree view and
  its data hooks).
