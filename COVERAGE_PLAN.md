# Coverage improvement plan (app-kit)

Not committed — working doc for whoever (human or AI) picks up coverage work next.
Delete or commit at your discretion once no longer useful.

## Context

- `packages/app-kit/vitest.config.ts` sets `coverage.all: true` and all four
  thresholds (`lines`/`functions`/`branches`/`statements`) to **85%**, on
  branch `chore/include-untested-files-in-coverage` (uncommitted as of writing;
  commit `0d15aa2` on that branch already has the config change).
- These thresholds are **aspirational** — the user explicitly chose to commit
  the config change before coverage caught up ("commit anyway, fix CI later").
  `pnpm test` currently exits 1 package-wide. That's expected, not a
  regression to "fix" by lowering thresholds.
- **Do this incrementally, file by file / small batch by small batch, not all
  at once.** Each session/PR should tackle one file or a tightly related
  cluster, verify, then stop — not attempt the whole list in one pass.
- As of the last measurement (after adding `src/genre-tree/useGenre.test.ts`,
  now at 100/100/100/100): package-wide `lines 29.12%`, `functions 61.15%`,
  `statements 29.12%`, `branches 78.74%`.

## The established test pattern — copy this

`src/genre-tree/useGenre.test.ts` is the reference implementation. Pattern:

```ts
const { fetchMock, useSessionMock, ... } = vi.hoisted(() => ({ ... }));

vi.mock("../transport/useFetchWrapper", () => ({ useFetchWrapper: () => ({ fetch: fetchMock }) }));
// ...mock every imported dependency the same way (must come before importing the module under test)

import { theHookUnderTest } from "./theHook";

describe("theHook", () => {
  beforeEach(() => { vi.clearAllMocks(); /* set default mock return values */ });

  it("...", () => {
    renderHook(() => theHookUnderTest(args));
    const { queryFn /* or mutationFn, onSuccess, enabled, queryKey */ } =
      useQueryWithParseMock.mock.calls[0][0]; // or useValidatedMutationMock
    // call queryFn()/mutationFn()/onSuccess() directly and assert on fetchMock,
    // invalidateQueriesMock, etc.
  });
});
```

Key ideas, all borrowed from existing conventions in the sibling frontend repos
(`hear-the-music-tree-frontend/src/lib/uploaded-track/hooks/useUpdateUploadedTrack.test.ts`
was the closest match at the time):

- Mock at the boundary (`useFetchWrapper`, `useSession`, `useQueryWithParse`,
  `useValidatedMutation`, `@tanstack/react-query`'s `useQueryClient`) rather
  than standing up a real `QueryClientProvider` tree. Extract the
  `mutationFn`/`queryFn`/`onSuccess`/`enabled` passed into the mocked
  lower-level hook and unit-test that logic directly.
- For every `scope === "reference" ? A : B` branch in the source, write (or
  parametrize) a test for **both** scopes — branch coverage in `v8` counts
  each side of the ternary independently. `useGenre.test.ts` initially covered
  only one side of several ternaries; going back and adding the missing-scope
  test case is what took it from 76% → 100% branch coverage without touching
  the source.
- No `<StrictMode>` wrapping, per `docs/testing.md` (this repo's own copy of
  that doc — check if app-kit has an equivalent; if not, the frontend repos'
  `docs/testing.md` conventions still apply since app-kit is consumed by them).

## Checking a single file's coverage without running the whole suite

```bash
cd packages/app-kit
npx vitest run src/path/to/file.test.ts --coverage 2>&1 | grep -E "Tests|file.ts "
```

Full package-wide numbers (slower, only needed to check overall threshold
progress, not after every small change):

```bash
pnpm test   # or: npx vitest run --coverage
```

For a precise per-file breakdown with full paths (the default text-table
reporter truncates long paths):

```bash
npx vitest run --coverage --coverage.reporter=json-summary --coverage.reporter=text
node -e '
const data = require("./coverage/coverage-summary.json");
for (const [file, s] of Object.entries(data)) {
  if (file === "total") continue;
  if (s.statements.pct < 100) console.log(`${s.statements.pct.toFixed(0)}%\t${file.replace(process.cwd()+"/","")}`);
}'
```

## Suggested order (biggest ROI / lowest effort first)

Work top to bottom within each batch; stop after a batch (or even a single
file) and let CI/review catch up before continuing.

### Batch 1 — pure hooks & lib functions (same `useGenre.test.ts` pattern, no DOM rendering needed)

Ordered roughly by statement count (bigger file = bigger coverage win per
test file written):

1. `src/transport/app-errors/app-error-factory.ts` (192 stmts) — largest
   pure-logic file in the whole gap list. High value.
2. `src/genre-tree/useGenrePlaylist.ts` (91) — same shape as `useGenre.ts`,
   and `useGenre.test.ts` already mocks `useInvalidateAllGenrePlaylistQueries`
   from this module, so you already know its contract.
2. `src/auth/code-exchange.ts` (89)
3. `src/transport/useFetchWrapper.ts` (60) — foundational; every other hook
   mocks this, but the wrapper itself has zero direct tests.
4. `src/transport/lib/use-validated-mutation.ts` (58)
5. `src/transport/fetch-wrapper.ts` (57)
6. `src/auth/SessionContext.tsx` (49) — context provider + `useSession`
   hook; test the provider logic directly (session persistence/restore),
   not just as a mock target.
7. `src/transport/site-urls.ts` (18)
8. `src/auth/spotify-required-cache.ts` (13)
9. `src/genre-tree/lib/formatting.ts` (12)
10. `src/transport/lib/use-query-with-parse.ts` (15)
11. `src/transport/query-client.ts` (9)
12. `src/auth/useLogout.ts` (10)
13. `src/genre-tree/lib/genre-playlist-helpers.ts` (7)
14. `src/genre-tree/lib/rating.ts` (1)

### Batch 2 — Zod schemas and trivial barrel files (cheap, mechanical)

These are almost pure `z.object({...})` definitions plus re-export
`index.ts`/`queryKeys.ts`/`endpoints.ts` files with 1-25 statements each.
A single `it("parses a valid X", () => { expect(() => Schema.parse(fixture)).not.toThrow(); })`
plus one invalid-shape test per schema clears most of these in a few
lines each. Batch them into one or two test files per directory rather than
one file per schema:

- `src/genre-tree/schemas/criteria-playlist/detailed.ts`, `simple.ts`
- `src/genre-tree/schemas/mb-recording.ts`, `mb-artist.ts`
- `src/genre-tree/schemas/track-playlist-rel/without-playlist.ts`
- `src/genre-tree/schemas/youtube-track/detailed.ts`
- `src/genre-tree/api/genre-playlists/{endpoints,queryKeys,index}.ts`
- `src/genre-tree/api/library/{index,youtube/endpoints,youtube/queryKeys,youtube/index}.ts`
- `src/transport/{index,app-errors/index,app-errors/app-error-types}.ts`
- `src/player/{index,PlayStates}.ts`, `src/auth/index.ts`, `src/genre-tree/index.ts`,
  `src/popup/index.ts`

For pure re-export `index.ts` files, a one-line "imports without throwing and
exposes X" test is enough — don't over-engineer these.

### Batch 3 — components / contexts requiring `render()` + Testing Library

More effort per file (need `@testing-library/react`'s `render`/`screen`,
`getByRole` per `docs/testing.md`), so save for after Batches 1-2 land and
raise the floor. Ordered by size:

1. `src/player/PlayerContext.tsx` (246)
2. `src/popup/TrackUploadPopup.tsx` (246)
3. `src/genre-tree/GenreTreeSkeleton.tsx` (221)
4. `src/auth/AuthCallbackHandler.tsx` (131)
5. `src/genre-tree/TrackListContext.tsx` (126)
6. `src/genre-tree/playlist-tree/TreeWheel.tsx` (115)
7. `src/genre-tree/GenreTreeView.tsx` (94)
8. `src/genre-tree/track-list-sidebar/TrackItem.tsx` (47)
9. `src/player/MediaController.ts` (44) — not a component, a class; can
   likely be unit-tested without RTL.
10. `src/genre-tree/TrackPositionPlayPause.tsx` (43)
11. `src/genre-tree/track-list-sidebar/TrackListSidebar.tsx` (43)
12. `src/genre-tree/Rating.tsx` (34)
13. `src/genre-tree/TrackListSidebarVisibilityContext.tsx` (32)
14. `src/player/youtubeIframeApi.ts` (23)

### Loose ends (already partially covered, just need a couple more cases)

- `src/popup/PopupButtons.tsx` — 22% (9 stmts total, tiny gap)
- `src/popup/BasePopup.tsx` — 87% (close, just missing branches)
- `src/transport/connectivity-error-context.tsx` — 93%
- `src/popup/useConnectivityErrorPopup.ts` — 98%, one line/branch short

## Verification checklist per file/batch

1. `npx vitest run src/path/to/file.test.ts --coverage` → confirm the target
   file's own row is at or near 100% before moving on.
2. `pnpm lint` (also runs the Turborepo build + `tsc --noEmit`) — must stay
   green.
3. Don't chase the global 85% threshold number directly each time; it moves
   slowly. Track it only every few files to gauge overall progress.
4. Commit test-only changes separately from any source changes. If writing a
   test surfaces an actual bug (like the earlier `useLoadExampleTreeGenre`
   output-schema bug that started this effort), stop and flag it — don't
   silently fix and bundle it into a "tests" commit.
