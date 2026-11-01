# app-kit

Two lockstep-versioned packages for BehindTheMusicTree React apps, consumed by
`grow-the-music-tree-frontend` and `hear-the-music-tree-frontend`:

- [`@behindthemusictree/app-kit`](packages/app-kit) — headless: transport, auth, popup state,
  player, and genre-tree data and state hooks. No styling.
- [`@behindthemusictree/app-kit-ui`](packages/app-kit-ui) — the styled BTMT components built on
  the hooks above, themed through CSS variables. See its README for the theme tokens.

Use app-kit alone to build a different design; add app-kit-ui for the BTMT one.

## app-kit

Published to GitHub Packages, with a subpath per module (also re-exported from the root):

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

## Development

```bash
pnpm install
pnpm dev     # builds the package in watch mode + runs apps/playground
```

`apps/playground` is a small Vite app for manually exercising exported components against mock
data — not published.

## Branching

Strict Gitflow: `main` is release-only (tagged), `develop` is the integration branch and default
branch for PRs. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full model.

## Release

_(For maintainers, run from a clean, up-to-date `develop`)_

```bash
pnpm release patch   # or minor / major
```

Cuts a `release/X.Y.Z` branch off `develop`, bumps both package versions, moves `CHANGELOG.md`'s
`[Unreleased]` section under the new version, then merges into both `main` (tagged) and
`develop` and pushes — the tag push triggers `.github/workflows/publish.yml` to build and
publish to GitHub Packages.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow, including hotfixes.
