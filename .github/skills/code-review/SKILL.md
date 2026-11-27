---
name: code-review
description: Review pull requests against app-kit's decoupling rules, subpath-export wiring, and release title requirements. Use for any PR touching packages/app-kit/src or its build/publish config.
---

# app-kit code review

`@behindthemusictree/app-kit` is shared plumbing consumed by
`grow-the-music-tree-frontend` and `hear-the-music-tree-frontend`. Review PRs
against the rules below in addition to general correctness.

## Decoupling (blocking)

- `packages/app-kit/src/**` must never import from
  `grow-the-music-tree-frontend` or `hear-the-music-tree-frontend`.
  Dependencies flow app → app-kit, never the reverse.
- App-specific behavior (data hooks, routes, popups) must be injected via
  props/callbacks (e.g. `PlayerProvider`'s `loadTrack`,
  `AuthCallbackHandler`'s callback props), not imported directly.
- `genre-tree` components must stay scope-parameterized
  (`"me" | "reference"`). Flag any component that hardcodes assumptions for
  one scope only.

## Export wiring (blocking)

When a module is added or moved under `packages/app-kit/src/<module>/`,
confirm all four are updated together:

1. `src/<module>/index.ts` barrel exports it
2. `src/index.ts` root barrel re-exports it
3. `packages/app-kit/tsup.config.ts` has a matching entry
4. `packages/app-kit/package.json`'s `exports` map has a matching subpath

A PR that touches only one or two of these is incomplete.

## Release titles (blocking)

Use the conventional PR title to describe the user-facing effect and set the semver bump.
Check that breaking changes use the `!` marker and document consumer migration.

## Publishing (blocking)

CI tags and publishes both packages through the shared release workflow. Flag release
changes that let the two manifests diverge or publish app-kit-ui before app-kit.

## General

- TypeScript strict mode: flag new `any` without a justification comment.
- Prefer existing utilities in the relevant module over introducing
  duplicate helpers.
- Don't flag missing abstractions, refactors, or features beyond the PR's
  stated scope — this repo avoids unrequested cleanup.
