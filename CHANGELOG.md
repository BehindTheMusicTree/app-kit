# Changelog

All notable changes to `@behindthemusictree/app-kit` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] - 2026-08-04

### Added

- Initial extraction of shared transport, auth, popup, UI, player, and genre-tree plumbing out of
  `grow-the-music-tree-frontend` into a standalone package: `transport` (fetch wrapper, query
  client, app-error types, subdomain base-URL builder), `auth` (session context, code-exchange
  core, logout, callback handler), `popup` (popup context, base popup chrome), `ui` (Table,
  Skeleton, Input, Button, Pagination, RingLoader, upload popup/buttons), `player` (generic
  `PlayerTrack`-based playback context), `genre-tree` (scope-parameterized D3 genre tree view and
  its data hooks).
