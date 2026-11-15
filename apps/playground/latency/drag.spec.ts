import { test, expect, chromium, type Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { capture, sha256, type Capture, type Consumer } from "./surface";

test.describe.configure({ mode: "serial" });
const fixtureBytes = await readFile(new URL("./fixtures/reference-tree.json", import.meta.url), "utf8");
// The browser parses these with the production schema before either renderer consumes them.
type Row = { uuid: string; name: string; isUnacceptedRoot: boolean; root: { uuid: string }; criteria: { uuid: string; name: string } | null };
const fixture: Row[] = JSON.parse(fixtureBytes);
const unaccepted = new Set(fixture.filter(row => row.isUnacceptedRoot).map(row => row.uuid));
const visible = fixture.filter(row => !row.isUnacceptedRoot && !unaccepted.has(row.root.uuid) && row.criteria);
const results: Capture[] = [];
const repetitions = Number(process.env.DRAG_LATENCY_REPETITIONS ?? "2");
if (!Number.isInteger(repetitions) || repetitions < 2 || repetitions > 10) throw new Error("DRAG_LATENCY_REPETITIONS must be an integer between 2 and 10");
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

async function installRoutes(page: Page, consumer: Consumer) {
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    // PlayerProvider preloads this script; playback is outside this diagnostic.
    if (url.href === "https://www.youtube.com/iframe_api") return route.fulfill({
      contentType: "application/javascript",
      body: "window.YT = { Player: function () { throw new Error('Playback outside drag diagnostic'); } }; window.onYouTubeIframeAPIReady?.();",
    });
    if (path === "/__drag-fixture.json") return route.fulfill({ json: visible });
    if (path.endsWith("/genre-playlists/tree/")) return route.fulfill({ json: fixture });
    if (path.endsWith("/regions/map/genres/")) return route.fulfill({ json: [] });
    if (path === "/api/auth/session") return route.fulfill({ json: null });
    if (path.endsWith("/playback/context/")) return route.fulfill({ json: { country: "FR" } });
    if (/\/genres\/[^/]+\/overview\/$/.test(path)) {
      const criteria = fixture.find(row => row.criteria?.uuid === path.split("/").at(-3))?.criteria;
      if (!criteria) throw new Error("Unknown diagnostic genre");
      return route.fulfill({ json: { ...criteria, summary: null, description: null, summarySourceUrl: null, image: null, essentialSongs: [] } });
    }
    if (path.startsWith("/api/") || url.hostname !== "127.0.0.1") {
      return route.fulfill({ status: 500, body: `Unconfigured ${consumer} diagnostic request: ${path}` });
    }
    return route.continue();
  });
}

for (let repeat = 0; repeat < repetitions; repeat++) {
  // Alternate order to expose ordering/warm-machine effects; every cell starts a fresh browser.
  const consumers: Consumer[] = repeat % 2 ? ["standalone", "app-kit"] : ["app-kit", "standalone"];
  for (const consumer of consumers) for (const observe of [false, true]) for (const dose of [0, 300]) {
    test(`${repeat + 1} ${consumer} style-observer=${observe} delay=${dose}`, async ({ baseURL }, info) => {
      const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
      try {
        results.push(await capture(browser, baseURL!, consumer, dose, observe, installRoutes, info));
      } finally {
        await browser.close();
      }
    });
  }
}

test("audit matching and injected-delay sensitivity", async ({}, info) => {
  const summary = {
    schemaVersion: 2,
    gesture: "press-then-immediate-80x10-move",
    revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    fixtureSha256: sha256(fixtureBytes),
    lockfileSha256: sha256(await readFile(new URL("../../../pnpm-lock.yaml", import.meta.url), "utf8")),
    platform: process.platform, architecture: process.arch,
    repetitions, valid: false,
    measurements: results.map(({ preparation, gestures: _gestures, positions: _positions, ...result }) => ({
      ...result, rendererNodesSha256: sha256(preparation.nodes),
      preparation: { ...preparation, nodes: undefined },
    })),
    calibration: [] as { consumer: Consumer; observe: boolean; drag: string; addedSurfaceMs: number }[],
    observerEffect: [] as { consumer: Consumer; drag: string; addedSurfaceMs: number }[],
  };
  try {
    expect(results).toHaveLength(repetitions * 8);
    const reference = results[0];
    for (const result of results) {
      expect(result.browser).toBe(reference.browser);
      expect(sha256(result.preparation.nodes)).toBe(sha256(reference.preparation.nodes));
      expect(result.preparation.viewport).toEqual(reference.preparation.viewport);
      expect(result.preparation.initial.x).toBeCloseTo(reference.preparation.initial.x, 1);
      expect(result.preparation.initial.y).toBeCloseTo(reference.preparation.initial.y, 1);
      expect(result.preparation.initial.k).toBeCloseTo(reference.preparation.initial.k, 6);
    }
    for (const consumer of ["app-kit", "standalone"] as const) {
      for (const cold of [true, false]) {
        const values = (observe: boolean, dose: number) => results.filter(row => row.consumer === consumer && row.observe === observe && row.dose === dose)
          .flatMap(row => cold ? row.latencies.slice(0, 1) : row.latencies.slice(1));
        for (const observe of [false, true]) {
          const addedSurfaceMs = median(values(observe, 300)) - median(values(observe, 0));
          summary.calibration.push({ consumer, observe, drag: cold ? "cold" : "subsequent", addedSurfaceMs });
          // Sensor sensitivity assertion, never a product latency budget.
          expect(addedSurfaceMs, `${consumer} injected delay must be detectable`).toBeGreaterThan(150);
        }
        summary.observerEffect.push({ consumer, drag: cold ? "cold" : "subsequent", addedSurfaceMs: median(values(true, 0)) - median(values(false, 0)) });
      }
    }
    summary.valid = true;
  } finally {
    await writeFile(info.outputPath("summary.json"), JSON.stringify(summary, null, 2));
  }
});
