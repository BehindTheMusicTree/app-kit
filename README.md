# app-kit

`@behindthemusictree/app-kit` — shared transport, auth, popup, UI, player, and genre-tree
plumbing for BehindTheMusicTree React apps. Extracted from `grow-the-music-tree-frontend` so
`grow-the-music-tree-frontend` and `hear-the-music-tree-frontend` can share one implementation
instead of maintaining forked copies.

## Package

See [`packages/app-kit`](packages/app-kit). Published to GitHub Packages as
`@behindthemusictree/app-kit`, with a subpath per module:

```tsx
import { useFetchWrapper } from "@behindthemusictree/app-kit/transport";
import { SessionContext, AuthCallbackHandler } from "@behindthemusictree/app-kit/auth";
import { PopupProvider, usePopup } from "@behindthemusictree/app-kit/popup";
import { Table, Button, Skeleton } from "@behindthemusictree/app-kit/ui";
import { PlayerProvider, type PlayerTrack } from "@behindthemusictree/app-kit/player";
import { GenreTreeView, useGenre } from "@behindthemusictree/app-kit/genre-tree";
```

Everything is also re-exported from the package root (`@behindthemusictree/app-kit`).

- `transport` — fetch wrapper, query client, app-error types, subdomain base-URL builder
- `auth` — session context, code-exchange core, logout, OAuth callback handler
- `popup` — popup context, base popup chrome
- `ui` — `Table`, `Skeleton`, `Input`, `Button`, `Pagination`, `RingLoader`, upload popup/buttons
- `player` — generic `PlayerTrack`-based playback context (consumer supplies `loadTrack`)
- `genre-tree` — scope-parameterized (`"me" | "reference"`) D3 genre tree view, its data hooks,
  and the upload/playlist/track-list engine it depends on

Several pieces are decoupled from any single app on purpose — `PlayerProvider` takes an injected
`loadTrack` loader instead of a hardcoded data hook, and `AuthCallbackHandler` takes injected
callback pathnames/handlers instead of hardcoded routes — so both consuming apps can plug in
their own data layer and routes.

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
pnpm release -- patch   # or minor / major
```

Cuts a `release/X.Y.Z` branch off `develop`, bumps the package version, moves `CHANGELOG.md`'s
`[Unreleased]` section under the new version, then merges into both `main` (tagged) and
`develop` and pushes — the tag push triggers `.github/workflows/publish.yml` to build and
publish to GitHub Packages.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow, including hotfixes.
