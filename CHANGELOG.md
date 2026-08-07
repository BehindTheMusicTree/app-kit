# Changelog

All notable changes to `@behindthemusictree/app-kit` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
