# app-kit

Two lockstep-versioned packages for BehindTheMusicTree React apps, consumed by
`grow-the-music-tree-frontend` and `hear-the-music-tree-frontend`:

- [`@behindthemusictree/app-kit`](packages/app-kit) — headless: transport, auth, popup state,
  player, and genre-tree data and state hooks. No styling.
- [`@behindthemusictree/app-kit-ui`](packages/app-kit-ui) — the styled BTMT components built on
  the hooks above, themed through CSS variables. See its README for the theme tokens.

Use app-kit alone to build a different design; add app-kit-ui for the BTMT one.

## app-kit

Published to npm, with a subpath per module (also re-exported from the root):

```tsx
import { useFetchWrapper } from "@behindthemusictree/app-kit/transport";
import { SessionProvider, useAuthCallback } from "@behindthemusictree/app-kit/auth";
import { PopupProvider, usePopup } from "@behindthemusictree/app-kit/popup";
import { PlayerProvider, type PlayerTrack } from "@behindthemusictree/app-kit/player";
import { useGenreTreeViewState, useGenreSearch } from "@behindthemusictree/app-kit/genre-tree";
```

- `transport` — fetch wrapper, query client, app-error types, subdomain base-URL builder
- `auth` — session context, code-exchange core, logout, `useAuthCallback`
- `popup` — popup context and state, `useConnectivityErrorPopup`, `useTrackUpload`
- `player` — generic `PlayerTrack`-based playback context (consumer supplies `loadTrack`)
- `genre-tree` — scope-parameterized (`"me" | "reference"`) schemas, data hooks, track-list
  providers, and the `useGenreTreeViewState` / `useGenreSearch` hooks

Pieces are decoupled from any single app: `PlayerProvider` takes an injected `loadTrack`,
`useAuthCallback` takes injected pathnames and handlers, and track lists take an optional
`renderArtistLink`.

## Genre music summaries

Reference genre detail and tree hooks require separate catalogue and playlist counts:
`genreOnlyTracksCount` and `genreAndSubgenresTracksCount`. Canonical genres expose inclusive
`canonical`, `regional`, and `all` counts; regional genres expose `all`. Inclusive counts already
contain the genre itself, and `all` is a deduplicated union. Personal playlists retain their
existing count contract.

`GenreMusicSelection` selects `genreOnly` or `genreAndSubgenres` with a subgenre scope. Use
`genreMusicCount` for the corresponding count and `genreMusicQueryParams` for API parameters.
Reference playback defaults to canonical subgenres for canonical genres and all subgenres for
regional genres. Playlist playback intersects actual members, including when filtered by artist;
the detail panel's song list describes the catalogue. Catalogue row playback uses
`playNewTrackListFromGenreCatalogue` (or the artist catalogue when filtered), so a playable
catalogue song need not belong to the genre playlist. Country availability can further restrict
the playback queue without changing global counts.

## Development

```bash
pnpm install
pnpm dev     # builds the package in watch mode + runs apps/playground
```

`apps/playground` is a small Vite app for exercising exported components against the staging
backend; it is not published. Its Playwright suite intercepts API and image requests with local
fixtures and runs at desktop and mobile widths. See [verification commands](CONTRIBUTING.md#5-verifying).

## Branching

Strict Gitflow: `main` is release-only (tagged), `develop` is the integration branch and default
branch for PRs. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full model.

## Release

_(For maintainers, run on a clean `release/*` branch from current `develop`, or a `hotfix/*` branch from `main`)_

```bash
pnpm release patch   # or minor / major
```

Prepares both package versions, their peer constraint, the lockfile and non-empty release notes.
Review and commit the files, push the branch and open a PR into `main`. CI creates the annotated
tag and publishes both packages through the existing OIDC workflow. After publication,
integrate `main` back into `develop` through a PR. Do not create or push release tags locally.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow, including hotfixes.

## Genre identity and selection

`GenreTreeView` and `useGenreTreeViewState` accept `selectedGenreUuid` and
`onSelectedGenreUuidChange`. `selectedGenreUuid` is a raw `string | null`, so a URL
value can be passed as is: one that names no genre shows "Genre not found" in the
panel. `onSelectedGenreUuidChange` reports branded `GenreUuid` values. Renderer node IDs and playlist UUIDs remain internal
visualization/playback identities; they are never selection aliases.

A selected genre loads its own detail endpoint even when it has no node or
playlist. Family and ancestor navigation reports genre UUIDs. Genre share targets
use `{ kind: "genre", genreUuid, name, scope }` (plus optional artist context).
Hosts should write `?genre=<genre UUID>` consistently across views and handle old
playlist links as unavailable entities, without reinterpreting them.

Hosts injecting `SearchGroups` receive `onSelectGenre(uuid)` to open remote results
in the current view. A geographic region is optional context, independent of the
selected genre. Selection actions should reopen collapsed panels even when the
UUID is unchanged.
