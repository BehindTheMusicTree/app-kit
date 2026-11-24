# 🧭 Contributing Guidelines

Thank you for your interest in contributing to `@behindthemusictree/app-kit`!

This package is consumed by `grow-the-music-tree-frontend` and `hear-the-music-tree-frontend`.
Changes here affect both apps, so please keep that blast radius in mind.

## Table of Contents

- [Contributors vs Maintainers](#contributors-vs-maintainers)
- [Development Workflow](#development-workflow)
  - [1. Fork \& Clone](#1-fork--clone)
  - [2. Environment Setup](#2-environment-setup)
  - [3. Branching (GitHub Flow)](#3-branching-github-flow)
  - [4. Developing](#4-developing)
  - [5. Verifying](#5-verifying)
  - [6. Committing](#6-committing)
  - [7. Pull Request Process](#7-pull-request-process)
  - [8. Releasing _(For Maintainers)_](#8-releasing-for-maintainers)
- [License \& Attribution](#license--attribution)

## Contributors vs Maintainers

**Contributors** can submit bug reports/feature requests via GitHub Issues, open pull requests,
improve documentation, and participate in discussions.

**Maintainers** review pull requests and maintain the publish workflow
(`.github/workflows/publish.yml`, which publishes both packages on npm through trusted publishing).

## Development Workflow

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR-USERNAME/app-kit.git
cd app-kit
```

Maintainers can clone directly:

```bash
git clone https://github.com/BehindTheMusicTree/app-kit.git
cd app-kit
```

### 2. Environment Setup

Requirements:

- **Node.js 20.x or higher**
- **pnpm** (see `packageManager` in `package.json` for the pinned version)

```bash
pnpm install
```

### 3. Branching (GitHub Flow)

Branch from `main` and open a pull request back into `main`. Squash merges use the pull
request title as the commit subject. Pushes to `main` go through pull requests.

### 4. Developing

```bash
pnpm dev     # tsup --watch on packages/app-kit + apps/playground running in parallel
```

`apps/playground` is a small Vite app for manually exercising exported components — use it to
sanity-check UI changes before opening a PR.

Generic, stateless UI primitives (`Button`, `Input`, `Table`, ...) live in
[`@behindthemusictree/ui`](https://github.com/BehindTheMusicTree/ui), not in this package. This
package never imports it: `packages/app-kit` is headless, and only `packages/app-kit-ui` consumes
`@behindthemusictree/ui` to build the styled business components. Neither should grow new generic
UI components of its own.

When adding a new module, export it from both its own barrel (`src/<module>/index.ts`) and the
root barrel (`src/index.ts`), and add a matching subpath entry to `tsup.config.ts` and the
`exports` map in `packages/app-kit/package.json`.

### 5. Verifying

```bash
pnpm build   # tsup: ESM + CJS + .d.ts for every entry point
pnpm lint    # tsc --noEmit across the workspace, including browser tests
pnpm test    # Vitest suites with coverage thresholds
pnpm --filter app-kit-playground exec playwright install chromium  # first run
pnpm --filter app-kit-playground test:e2e
```

All checks must pass before opening a PR; CI runs them with Chromium installed.
Browser tests exercise the real playground at desktop and 390px mobile widths. API and image
requests use deterministic fixtures, so they need neither staging access nor an API key.
Each run starts its own Vite server on an allocated port and never reuses an existing server.
The suite also covers mobile search/account access and sheet controls at responsive breakpoints.
To use installed Chrome locally, prefix the test command with `PLAYWRIGHT_CHANNEL=chrome`.
CI retains screenshots and traces on failure.
Failed browser tests save traces under `apps/playground/test-results/`; inspect one with
`pnpm --filter app-kit-playground exec playwright show-trace <trace.zip>`.

### Drag latency diagnostic

```bash
pnpm --filter app-kit-playground test:latency:analysis
pnpm --filter app-kit-playground test:latency --project=chromium-headless
pnpm --filter app-kit-playground test:latency --project=chromium-headless-shell
```

The analysis suite checks the measurement algorithm without a browser or Vite server.
The browser suite has two projects: `chromium-headless` runs bundled full Chromium headless;
`chromium-headless-shell` runs Playwright Headless Shell at the same pinned version. Omitting `--project`
runs both sequentially. `PLAYWRIGHT_CHANNEL` does not affect either diagnostic project.
Functional desktop/mobile tests remain in `test:e2e` and the regular validation workflow.
Explicit per-cell launches honor the project's channel and headless setting, including
`--headed`; headed input must still pass the same pointer-sequence validity checks.

This isolated Chromium suite uses a versioned public reference-tree fixture and a dedicated
Vite server. It needs no backend or credentials. It compares the full playground with the
standalone renderer using the same visibility projection, verifies actual renderer-input
hashes, geometry, dot counts and initial transforms, and starts a fresh browser for every
matrix cell. Two repetitions alternate consumer order; `DRAG_LATENCY_REPETITIONS` accepts
integers from 2 to 10. Each cell measures the first drag without preparatory pan/zoom and two
subsequent drags. Automated mouse input does not establish MacBook trackpad equivalence.
Each gesture presses the background and immediately moves 80 CSS pixels horizontally and
10 vertically across 60 scheduled moves at 16 ms intervals. Dispatch responses are awaited
only after scheduling completes, so renderer blocking does not pace the input producer.
It holds for one second after the movement to capture the response. Received events may
be coalesced; their timestamps in capture.json expose the actual input cadence.
The per-gesture tracking samples report distance in CSS pixels between the latest received
pointer position and the captured tree displacement. Screencast frames can be sparse; this
is not physical display latency. `latencies` measures move-to-surface time;
`clickLatencies` measures press-to-surface time, and `inputGaps` records the actual
press-to-move interval so driver delay remains visible.

The primary observation is the first captured compositor surface whose attached magenta
marker moves more than 1.5 CSS pixels after the first pressed pointer move. JPEG dimensions
are normalized to CSS pixels, including Retina captures. Surface timestamps are aligned with
`performance.timeOrigin`. This observes compositor surfaces, not physical screen presentation.
Optional per-frame computed-style reads record first-transform timing; the matrix reports
their observer effect separately. The marker, screencast and event listeners can also affect
rendering, so these numbers describe an instrumented harness.

Sensor validity is asserted: stationary pre-input and moved marker observations, unambiguous
marker size/count, nondecreasing timestamps and pointer sequence, one measured injected
delay, clean runtime, matching renderer inputs and geometry. A 300 ms injected main-thread
block must add more than 150 ms to the median captured-surface latency for both consumers,
with and without style reads, for cold and subsequent drags. This checks sensor sensitivity;
the injected controls are excluded from the performance assertion. Missing observations fail
the diagnostic and invalidate the budget conclusion. A valid measurement above budget fails
only the budget assertion; a valid measurement within budget passes both stages. The median app-kit click-to-surface delay across baseline continuous gestures
must be at most 100 ms. This responsiveness budget is not calibrated across hardware.

`latency-results/` contains per-cell JSON events, timing/marker positions and compressed raw
JPEG frames, plus a budget attachment and a final versioned summary with fixture/lockfile/input hashes and calibration
and observer comparisons. The fixture contains public tree metadata and counts only; requests
outside the local harness fail. The summary records the project, channel and headless setting.
`Drag latency diagnostic` runs on PRs into main and manually. An independent analysis job
gates the surface matrix: full Chromium on Linux and Intel macOS, and Headless Shell on both platforms. Each lane runs calibration and budget checks with one worker and no retries;
failure in one lane does not cancel the others. Artifacts have separate platform and mode names,
retain evidence for seven days even on failure, and jobs fail when the diagnostic fails.
The identical 100 ms threshold is not calibrated between modes or runner hardware. The
repository ruleset currently does not require this job to merge. Raw frame arrival order is
preserved; analysis orders frames by compositor timestamp.

The same lanes also run `pnpm --filter app-kit-playground exec playwright test
--config playwright.pipeline.config.ts --project=chromium-headless` (or
`chromium-headless-shell`). This isolated rectangle control compares screencast on/off
and rendering trace on/off, with two fresh-browser repetitions and three drags per cell.
`pipeline-results/` includes compressed CDP rendering traces, raw frames, page/host clock
pairs, input dispatch/receipt times, sampled transforms, decoded marker positions, browser
arguments and GPU information. Trace-off cells quantify instrumentation effects; no-capture
cells provide rendering traces rather than a captured-surface metric. Controls validate
pressed inputs, release, final transform and captured marker movement without imposing a
new latency threshold. They run even when the original surface budget fails. Existing
surface artifacts additionally record host frame arrivals, input dispatch acknowledgements,
page clocks and input event timestamps. Neither trace nor DOM observations establish
physical-display latency; CI results cannot establish the cause of a local-only delay.

For browser/backend experiments without local browser storage, manually dispatch `Drag latency
diagnostic` with `experiment=true` and `order=full-first` or `shell-first`. Each Linux and Intel
macOS job runs sequentially: full and Shell calibrated suites in the selected order, full
Chromium with `--disable-gpu`, then full Chromium restored to its default arguments. All four
suites retain both consumers, two fresh launches per cell, injected-delay calibration, audit
assertions and the unchanged 100 ms budget. Failures are preserved; later phases still run and
any failure makes the experiment job fail. There are no retries.

Three additional phases capture rendering traces for default full Chromium, GPU-disabled full
Chromium and Shell using only unobserved zero-dose baselines. Those filtered phases do not run
the calibration audit or budget; compare them with the complete untraced suites to assess
instrumentation effects. `DRAG_DIAGNOSTIC_DISABLE_GPU=1` and `DRAG_DIAGNOSTIC_TRACE=1` select
these diagnostic options; omit them or use `0` to disable them. Every tree capture records
browser arguments, version and `SystemInfo.getInfo` in `environment.json`. Verify the effective
backend: disabling GPU is an intervention, not proof of which backend is active or of causality.
Hosted runners may use software rendering even in the default configuration.

`experiment-results/manifest.json` records the commit, fixture/lockfile hashes, fixed plan,
phase commands, timestamps and exit codes. Per-phase logs and capture outputs are uploaded
even on failure. For independent repetitions, dispatch the same pinned branch head three
times with predefined orders `full-first`, `shell-first`, `full-first`, preserving all results
rather than rerunning until green. Unrelated jobs may run concurrently on other runners;
browser phases on one runner remain sequential. These experiments do not provision a GPU
runner or establish that a local hardware-specific delay has been reproduced.

### 6. Committing

Use [Conventional Commits](https://www.conventionalcommits.org/) for pull request titles.
Describe the user-facing change in the title. Release Please uses the squash commit to
determine the version bump and generate the changelog. Use `feat:` for a minor release,
`fix:` for a patch and `!` for a breaking change. Commits scoped to the playground latency
diagnostics are excluded from release calculation.

### 7. Pull Request Process

1. Ensure build, lint, unit/integration tests, and browser tests pass locally.
2. Open a PR against `main` describing what changed and why. Document consumer migration
   steps for breaking changes.

### 8. Releasing _(For Maintainers)_

Release Please updates the changelog and both package versions in a PR that merges
automatically after the required checks pass. The same main-push workflow validates the
merged version, creates its annotated tag and publishes both packages to npm with provenance
through Trusted Publishing. The build packs `app-kit-ui` with an `app-kit` peer range derived
from the workspace version and publishes `app-kit` first.

An existing npm version is skipped only if its SHA-512 integrity matches the packed
artifact. CI creates the GitHub Release after both packages are available. To recover from
a partial publication, rerun the failed publication on the same commit.

## License & Attribution

By contributing, you agree your contributions are licensed under this repository's
[LICENSE](LICENSE).
