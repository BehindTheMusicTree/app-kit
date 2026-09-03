---
name: launch
description: Use this skill when asked to run, start, dev-serve, or preview app-kit, or to confirm a change works in the real app. Covers `pnpm dev` running the package build in watch mode alongside apps/playground, a Vite app for manually exercising exported components.
---

# Launch app-kit

`app-kit` is a Turborepo publishing a library package
(`packages/app-kit`, `@behindthemusictree/app-kit`) consumed by
`grow-the-music-tree-frontend` and `hear-the-music-tree-frontend`. There is no
app to run in production — the "launch" target is `apps/playground`, a small
Vite app for manually exercising exported components against mock data before
opening a PR. It is not published.

## 1. Install

```bash
pnpm install
```

Requires a GitHub PAT with `read:packages` scope, exported as `NPM_TOKEN`, to
install `@behindthemusictree/genre-tree-view` (a private dependency) per
`.npmrc`.

## 2. Env setup (first run only)

`apps/playground/.env.local` is gitignored; if missing, create it with:

```
GTMT_PROTOTYPE_API_KEY=<value>
```

Only needed if playground code paths proxy `/api/grow-prototype-proxy` to the
staging grow-api (`vite.config.ts`) — that proxy throws if the key is unset
when a request actually hits it. The dev server itself starts fine without it.

## 3. Start the dev environment

```bash
pnpm dev
```

Runs `turbo run dev`, which is `dev: { cache: false, persistent: true }` in
`turbo.json` — it fans out to every workspace's `dev` script in parallel:
`tsup --watch` on `packages/app-kit` (rebuilds the library on change) plus
`vite` in `apps/playground` (serves the preview app, default
`http://localhost:5173`).

## 4. Verify

Open the printed playground URL and exercise the component(s) you changed.
Since `packages/app-kit` rebuilds on save via `tsup --watch`, edits to the
library show up in the playground without restarting `pnpm dev`.

For a non-visual check instead, `pnpm build && pnpm lint` (tsup + `tsc
--noEmit`) is the primary type-safety gate; run `pnpm test` for the Vitest
suite under `packages/app-kit`.
