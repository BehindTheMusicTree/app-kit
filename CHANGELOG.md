# Changelog

All notable changes to `@behindthemusictree/app-kit` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- **playground**: points at `grow-api-staging` instead of `hear-api-staging` — the playground
  exercises `GenreTreeView`'s `reference` scope, which is backed by grow-the-music-tree-api's
  unauthenticated `genres`/`genre-playlists`/`library/youtube` routes, not hear's.

## [4.4.3] - 2026-08-27

### Fixed

- **genre-tree**: `TreePerRoot`/`TreeWheel` now surface a popup (`InternalErrorPopup`) when their
  fetch's `onError` fires, instead of only `console.error`-ing — a `ZodError` from the backend
  (e.g. a missing/null field) previously failed silently with no user-visible feedback.
- **genre-tree**: `durationInSec`/`durationStrInHourMinSec` in the criteria-playlist detailed
  schema are now `nullable().optional()` instead of required, matching the existing
  `mb-recording.ts` pattern — the backend can omit or null these fields for tracks without
  duration data without failing the whole playlist detail response's validation.

## [4.4.2] - 2026-08-27

### Fixed

- **genre-tree**: `useListFullGenrePlaylists` now follows pagination (`next`) until every result
  is collected, instead of relying on a single request with `pageSize: 1000` to return the whole
  list in one page. Backends that clamp `pageSize` below what's requested (e.g. a server-side
  `PAGINATION_PAGE_SIZE_MAX`) were silently truncating the "full" tree fetch — on trees larger
  than the cap, `overallTotal` correctly reported the true count but `results` only held the
  first page, so downstream checks like `hasMainstreamPopRoot` could report `false` even when the
  tree genuinely had a matching root further down the (unfetched) list.

## [4.4.1] - 2026-08-27

### Fixed

- **genre-tree**: `useListFullGenrePlaylists`'s `"reference"` scope query key now includes the
  resolved backend base URL. Previously `genrePlaylistQueryKeys.reference.full` was a single
  static key shared by every consumer using `scope: "reference"`, so two trees fetched from
  different backends (e.g. grow's real reference tree and its read-only prototype/demo tree)
  collided in the react-query cache — navigating between them within the 60s `staleTime` window
  served stale data from whichever backend fetched first.

## [4.4.0] - 2026-08-27

### Added

- **genre-tree**: `GenreTreeView` supports a new `"pop-core"` view mode, delegating to a new
  `GenrePlaylistTreeWheelRadialPopCore` wrapper (`playlist-tree/TreeWheelRadialPopCore.tsx`) around
  `@behindthemusictree/genre-tree-view`'s `GenreTreeWheelRadialPopCore`. The internal view-mode
  toggle (used when `viewMode` isn't externally controlled) gains a "Pop/Core" button, disabled
  with an explanatory `title` when the genre tree has no root named exactly "Mainstream Pop".
- **genre-tree**: exported a new pure helper, `hasMainstreamPopRoot(nodes: GenreTreeNode[]): boolean`
  (from `lib/genre-playlist-helpers.ts`, re-exported via the package root), so downstream consumers
  owning their own pop-core toggle UI can apply the same check.
- **genre-tree**: `CriteriaMinimumSchema` now parses an optional `side: "core" | "pop" | null`
  field (matching the backend's `criteria.side`), and `TreeWheel`/`TreePerRoot`/the new
  `TreeWheelRadialPopCore` wrapper all map it onto their `GenreTreeNode`s' `side` field. Previously
  `side` was silently stripped during response parsing.

## [4.3.0] - 2026-08-27

### Added

- **genre-tree**: `GenreTreeView` accepts an optional `readOnly` prop. When true, it hides the
  "Add root" and load-tree buttons and suppresses per-node create/rename/reparent affordances in
  both the stacked and wheel tree views, for a read-only/prototype consumer. Defaults to false,
  preserving existing behavior.

## [4.2.0] - 2026-08-26

### Added

- **genre-tree**: app-kit now re-exports `@behindthemusictree/genre-tree-view`'s stylesheet at
  `@behindthemusictree/app-kit/genre-tree/styles.css` (copied into `dist/genre-tree/styles.css` at
  build time). Consumers that only needed the CSS no longer need a direct dependency on
  `@behindthemusictree/genre-tree-view`.

## [4.1.1] - 2026-08-26

### Changed

- Bumped `@behindthemusictree/genre-tree-view` to 1.0.3 — `GenreTreeWheelRadialPopCore`'s boundary
  circles read consistently and the "Mainstream Pop" center chip/subtree now render white for
  legibility; a single/childless root's card no longer gets clipped by an undersized svg height;
  `splitRootGroupBySide` now throws on a root with more than one non-`"pop"` direct child instead
  of silently dropping the extras.

## [4.1.0] - 2026-08-26

### Added

- **genre-tree**: `GenreTreeView` accepts an optional controlled `viewMode` prop (and exports the
  `GenreTreeViewMode` type). When provided, the internal Stacked/Wheel toggle buttons are not
  rendered, letting a consumer host that toggle elsewhere (e.g. a global app header). Omitting the
  prop keeps the existing uncontrolled behavior with the internal toggle.

## [4.0.2] - 2026-08-25

### Fixed

- **genre-tree**: `useLoadExampleTreeGenre` validated the `tree/load-example` mutation's response
  against `CriteriaDetailedSchema` (a single genre node), but the endpoint actually returns
  `{ message: string }`. Every load-example-tree call failed output validation even though the
  import succeeded server-side. Now validated against the actual `{ message: string }` shape.

### Changed

- **testing**: coverage now includes every source file (`vitest` coverage `all: true`), not just
  files touched by a test, so untested code shows up in the report instead of being silently
  excluded from the global average. Added tests to close the resulting gap; coverage is now
  99.27%/100%/98.29%/99.27% (lines/functions/branches/statements). CI thresholds raised from the
  85% placeholder to match: lines 99, functions 100, branches 98, statements 99.

## [4.0.1] - 2026-08-24

## [4.0.0] - 2026-08-23

### Removed

- **BREAKING**: **genre-tree**: removed the "uploaded track" concept entirely. Shared
  track-list/playback plumbing is now generic over `T extends TrackBase` instead of being hard-wired
  to a closed `TrackDetailed = z.union([UploadedTrackDetailedSchema, YoutubeTrackDetailedSchema])`.
  - Removed modules: `useTrackEdition`, `UploadedTrackEditionPopup`, `useUploadedTrack` (and its
    `useUploadTrack`, `useUpdateUploadedTrack`, `useDownloadTrack`, `UseDownloadTrackOptions`
    exports), `schemas/uploaded-track/*` (`detailed`, `file`, `form/{form,creation,update}`),
    `schemas/track/detailed` (the closed `TrackDetailedSchema` union), and
    `api/library/uploaded/*` (`libraryEndpoints.me.uploaded`, `libraryQueryKeys.me.uploaded`).
  - `useListTracks` (formerly in `useUploadedTrack.ts`) moved into `TrackListContext.tsx` and is
    now generic: `useListTracks<T>(scope, getBackendBaseUrl, schema, listEndpoint, listQueryKey,
    page?, pageSize?)`, with the endpoint/query-key selection injected by the caller instead of
    branching internally on `scope`.

### Changed

- **BREAKING**: **genre-tree**: `TrackList`, `TrackListOrigin` (and their `TrackListFromTrack`/
  `TrackListFromCriteriaPlaylist`/`TrackListOriginFromTrack`/`TrackListOriginFromCriteriaPlaylist`
  subclasses), `TrackListContext`/`TrackListProvider`, `TrackItem`, and `TrackListSidebar` are now
  generic over `T extends TrackBase`.
  - `TrackListProvider` now requires `schema`, `listEndpoint`, and `listQueryKey` props (in
    addition to `getBackendBaseUrl`) so consumers supply their own track shape and list source.
  - `TrackItem`/`TrackListSidebar` drop `getBackendBaseUrl` and the built-in edit/duration UI in
    favor of injected `renderDuration?: (track: T) => ReactNode` and
    `renderActions?: (track: T) => ReactNode` slots.
  - `schemas/uploaded-track-playlist-rel/without-playlist` (fixed `TrackPlaylistRelWithoutPlaylistSchema`)
    is renamed to `schemas/track-playlist-rel/without-playlist` and replaced by a factory,
    `makeTrackPlaylistRelSchema<T extends z.ZodTypeAny>(trackSchema: T)`.
  - `schemas/criteria-playlist/detailed`'s fixed `CriteriaPlaylistDetailedSchema`/
    `CriteriaPlaylistDetailed` are replaced by a factory,
    `makeCriteriaPlaylistDetailedSchema<T extends z.ZodTypeAny>(trackSchema: T)` (plus a generic
    `CriteriaPlaylistDetailed<T extends z.ZodTypeAny>` type alias derived from it).
  - `useFetchGenrePlaylist`/`useFetchGenrePlaylistDetailed` (in `useGenrePlaylist.ts`) each gain a
    required `criteriaPlaylistDetailedSchema` parameter; `GenreTreeView`,
    `GenrePlaylistTreePerRoot`, and `GenrePlaylistTreeWheel` are now generic over `T extends
    TrackBase` and require a `criteriaPlaylistDetailedSchema` prop threaded down to it.
  - `api/library/index.ts` drops the `me`/`uploaded` branch; only `reference.youtube` remains.

  Consumers must now supply their own track schema (extending `TrackBaseSchema`), list
  endpoint/query-key, a `criteriaPlaylistDetailedSchema` built via
  `makeCriteriaPlaylistDetailedSchema`, and their own edit/duration render slots for `TrackItem`/
  `TrackListSidebar` — upload/edit/download UI is no longer built in.

## [3.0.0] - 2026-08-22

### Changed

- **BREAKING**: **genre-tree**: renamed identifiers to reflect that list/playback plumbing
  operates on the generic `TrackDetailed` union, not just uploaded tracks:
  - `TrackList.uploadedTracks` → `TrackList.tracks` (and on both subclasses)
  - `TrackListFromUploadedTrack` → `TrackListFromTrack`
  - `TrackListOriginFromUploadedTrack` → `TrackListOriginFromTrack` (ctor param
    `uploadedTrack` → `track`)
  - `TrackListOriginType.UPLOADED_TRACK` → `TrackListOriginType.TRACK` (value also changed,
    `"UPLOADED_TRACK"` → `"TRACK"` — this is an in-memory discriminant only, never serialized)
  - `useTrackList().playNewTrackListFromUploadedTrackUuid` →
    `playNewTrackListFromTrackUuid` (signature unchanged)
  - `UploadedTrackPositionPlayPause` (component + props type) → `TrackPositionPlayPause` /
    `TrackPositionPlayPauseProps`, file renamed accordingly

  `useUploadTrack`, `useUpdateUploadedTrack`, `useDownloadTrack`, `useTrackEdition`,
  `UploadedTrackEditionPopup`, `UploadedTrackDetailed(Schema)`, `libraryEndpoints.me.uploaded`,
  and `TrackUploadPopup` are unchanged — they're genuinely upload-specific.

## [2.0.0] - 2026-08-22

### Changed

- **BREAKING**: **genre-tree**: `GenreTreeView` (and `GenrePlaylistTreePerRoot`/
  `GenrePlaylistTreeWheel`) drop the built-in upload wiring — `uploadTimeoutMs` is removed and
  `onUploadFiles` is no longer wired to `@behindthemusictree/genre-tree-view`'s tree components.
  In its place, `GenreTreeView` takes an `additionalActions?: (node: GenreTreeNode) =>
  GenreTreeAction[]` prop forwarded unchanged to the underlying tree/wheel — consumers now supply
  their own upload (or other) node actions. `GenreTreeAction` is re-exported from `genre-tree` for
  convenience. `useUploadTrack`/`useUpdateUploadedTrack`/`useDownloadTrack` are unchanged and
  remain public for consumers to call directly.

## [1.3.0] - 2026-08-20

### Added

- **Player**: `PlayerTrack` is now a discriminated union (`AudioPlayerTrack` | `YoutubePlayerTrack`)
  instead of a single audio-only shape. Playback for both kinds is driven through a new
  `MediaController` interface (`AudioMediaController` / `YoutubeMediaController`), so
  `PlayerContext`'s play/pause/seek code no longer branches on track kind. YouTube tracks play
  through the YouTube IFrame Player API, lazy-loaded once per page (`loadYoutubeIframeApi`) and
  mounted into a new `<PlayerVideoSurface />` component that consumers render wherever the video
  should appear. Needed for `gtmt-api`'s reference tracks, which have no self-hosted audio and are
  embedded YouTube videos instead.

### Changed

- **genre-tree**: `TrackDetailedSchema` is now a real discriminated union —
  `UploadedTrackDetailed | YoutubeTrackDetailed`, each tagged with a `kind` field (`"uploaded"` /
  `"youtube"`) stamped on the parsed output — replacing the old flat schema that made
  `relativeUrl`/`file`/`youtubeVideoId` all optional on one shape. `UploadedTrackDetailedSchema`
  keeps `relativeUrl`/`file` required (uploaded tracks always have them); the new
  `YoutubeTrackDetailedSchema` requires `youtubeVideoId` and has no file fields at all. Upload-only
  surfaces (`useUploadTrack`, `useUpdateUploadedTrack`, `UploadedTrackEditionPopup`,
  `useTrackEdition`) are typed against `UploadedTrackDetailed` specifically; list/playback surfaces
  (`useListTracks`, `TrackList`, `TrackListContext`) stay on the generic `TrackDetailed` union.
  `TrackItem` now gates its edit affordance on `track.kind === "uploaded"`, since gtmt-api's
  `YoutubeTrackViewSet` has no update route. Neither backend sends a `kind` field on the wire — each
  route only ever serves one track kind, so a plain `z.union` (not `z.discriminatedUnion`) is used,
  with each member schema stamping its own `kind` via `.transform()` on the output.

  Also renamed the playlist-relation fields that mirror gtmt-api's `UploadedTrack` → `Track` rename
  to match: `UploadedTrackPlaylistRelWithoutPlaylistSchema.uploadedTrack` → `.track`,
  `CriteriaPlaylistDetailedSchema.uploadedTrackPlaylistRelations` → `.trackPlaylistRelations`,
  `.uploadedTracksCount`/`.uploadedTracksArchivedCount` → `.tracksCount`/`.tracksArchivedCount`, and
  `CriteriaDetailedSchema.uploadedTracks` → `.tracks` (same count fields). hear-the-music-tree
  doesn't consume the criteria/criteria-playlist schemas, so this only affects gtmt-front.
- **genre-tree**: `libraryEndpoints.reference` now exposes `.youtube` (list/detail/delete only,
  mirroring `YoutubeTrackViewSet`) instead of `.uploaded` — gtmt-api's `reference/library/uploaded`
  route is gone. `libraryEndpoints.me.uploaded` (hear-the-music-tree's real uploaded-audio flow) is
  unchanged.

## [1.2.0] - 2026-08-16

### Added

- **Popup**: Added `AuthErrorPopup`, `InternalErrorPopup`, `NetworkErrorPopup`, `AuthPopup`, and
  `SpotifyAuthErrorPopup`, extracted from `grow`/`hear`'s local copies (which were near-identical
  apart from `topOffset` and env-var reads). `InternalErrorPopup` and `SpotifyAuthErrorPopup` now
  take an explicit `contactEmail` prop instead of reading `process.env.NEXT_PUBLIC_CONTACT_EMAIL`
  directly, and `AuthPopup` takes `spotifyOnlyDescription`/`defaultDescription` props instead of
  hardcoded copy, since both env var name and body copy differ per consuming app.

## [1.0.2] - 2026-08-15

### Fixed

- `GenreTreeView`'s root now sizes with `h-full` instead of `h-screen`. `h-screen` (100vh) assumed
  `GenreTreeView` was the only thing on the page, which is never true for a real consumer (nav
  header, player bar, popups all share the viewport). Whenever `GenreTreeView` rendered below any
  other content, its `h-screen` block extended past the actual visible viewport, pushing
  `GenreTreeWheel`'s bottom-anchored zoom in/out controls below the fold — present in the DOM but
  invisible without scrolling. `h-full` makes it fill its parent instead; consumers must give that
  parent an explicit bounded height (as `apps/playground` and both `grow`/`hear`'s `Page` component
  already do via `flex flex-col` + `min-h-0` chains).
- `apps/playground` was pinned to `@behindthemusictree/genre-tree-view@0.4.0` directly, independent
  of `packages/app-kit`'s own `0.5.0` dependency, so the playground rendered `0.5.0`'s
  `GenreTreeWheel`/`GenreTree` markup (new absolutely-positioned pan/zoom stage) styled with
  `0.4.0`'s CSS (no clipping/positioning rules for it), producing an overlapping, unclipped wheel
  and tree. Fixed by introducing a pnpm `catalog:` entry in `pnpm-workspace.yaml` for
  `@behindthemusictree/genre-tree-view`, `@behindthemusictree/ui`, and `@behindthemusictree/brand`,
  and switching both `packages/app-kit` and `apps/playground` to reference `"catalog:"` instead of
  hardcoding each version separately — a single source of truth per dependency, so this class of
  drift can't recur.

## [1.0.1] - 2026-08-14

### Changed

- Bumped `@behindthemusictree/genre-tree-view` to `0.5.0` (shared pan/zoom viewport for
  `GenreTree`/`GenreTreeWheel`). This package doesn't use the removed `zoomScale`/
  `onZoomScaleChange` props, so no code change was needed here.

## [1.0.0] - 2026-08-14

### Removed

- **BREAKING: `./ui` subpath removed.** `Button`, `IconTextButton`, `Input`, `Table`, `Skeleton`,
  `Pagination`, `RingLoader`, `UploadButtons`, and the `cn()` class-name helper have moved out of
  `@behindthemusictree/app-kit` into a new dedicated package,
  [`@behindthemusictree/ui`](https://github.com/BehindTheMusicTree/ui). Import them from
  `@behindthemusictree/ui` instead of `@behindthemusictree/app-kit/ui`; props are unchanged.
  `TrackUploadPopup` stays in this package (business logic) but moved from `./ui` to `./popup` —
  import it from `@behindthemusictree/app-kit/popup` instead.

### Changed

- Depends on `@behindthemusictree/ui` (`^0.1.0`) instead of bundling those components directly;
  dropped the now-unused `classnames` dependency.
- Bumped `@behindthemusictree/brand` to `12.0.0`, which dropped its own duplicate, unused `Button`
  export — this package never consumed it, so no code change was needed here.

## [0.2.0] - 2026-08-13

### Changed

- `ui` components (`Button`, `Pagination`, `RingLoader`, `Skeleton`, `TrackUploadPopup`) now
  reference `@behindthemusictree/brand`'s CSS var color tokens (`--color-neutral-*`,
  `--color-red-*`, `--color-green-*`, `--color-blue-*`) instead of hardcoded Tailwind color
  classes, so palette changes propagate from the brand package. No visual change — the token
  values match the previously-hardcoded Tailwind colors exactly.

## [0.1.12] - 2026-08-11

### Fixed

- Uploading a file by dropping it onto a genre tree node (`GenrePlaylistTreePerRoot`) now sends the
  genre's own UUID (`genrePlaylist.criteria.uuid`) instead of the genre-playlist's UUID
  (`genrePlaylist.uuid`), which the backend's `genre` field never actually matches — every such
  upload previously failed with an "object does not exist" validation error.

## [0.1.11] - 2026-08-11

### Changed

- `GenreTreeView`'s "Add root" button is now hidden while the tree is loading (listing genres or
  loading the example/reference tree), instead of staying visible and clickable throughout.

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
