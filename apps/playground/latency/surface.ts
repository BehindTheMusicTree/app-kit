import { expect, type Browser, type Page, type TestInfo } from "@playwright/test";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import type { GenreTreeNode } from "@behindthemusictree/genre-tree-view";

export const sha256 = (data: string) => createHash("sha256").update(data).digest("hex");
export type Consumer = "app-kit" | "standalone";
type Point = { x: number; y: number };
type Sample = Point & { at: number; k: number };
type Input = Point & { type: string; at: number; buttons: number };
type Injection = { start: number; end: number; requestedMs: number };
type Gesture = { initial: Sample; final?: Sample; events: Input[]; samples: Sample[]; injections: Injection[] };
type Probe = Gesture & { stop: () => void };
declare global {
  interface Window {
    __dragRendererNodes?: GenreTreeNode[];
    __dragProbe?: Probe;
  }
}
type Frame = {
  data: string;
  metadata: { timestamp?: number; deviceWidth: number; deviceHeight: number };
};
type Position = { at: number; point: (Point & { count: number }) | null };
export type Capture = {
  consumer: Consumer; dose: number; observe: boolean; browser: string;
  preparation: { viewport: Point & { width: number; height: number }; initial: Sample; dots: number; nodes: string };
  gestures: Gesture[]; positions: Position[]; latencies: number[]; transforms: (number | null)[];
};

export async function capture(
  browser: Browser, baseURL: string, consumer: Consumer, dose: number, observe: boolean,
  installRoutes: (page: Page, consumer: Consumer) => Promise<void>, info: TestInfo,
): Promise<Capture> {
  const context = await browser.newContext({ viewport: { width: 1200, height: 814 }, deviceScaleFactor: 1, serviceWorkers: "block" });
  const page = await context.newPage();
  const errors: string[] = [];
  const frames: Frame[] = [];
  const gestures: Gesture[] = [];
  let marker: Point & { timeOrigin: number } | undefined;
  try {
    page.on("pageerror", error => errors.push(error.message));
    page.on("requestfailed", request => errors.push(`Failed request: ${request.url()} ${request.failure()?.errorText}`));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await installRoutes(page, consumer);
    if (consumer === "standalone") await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.style.margin = "0";
        document.getElementById("root")!.style.cssText = "position:absolute;left:24px;top:206px;width:1152px;height:584px";
      });
    });
    await page.goto(`${baseURL}/${consumer === "standalone" ? "drag-standalone.html" : ""}`);
    await page.locator('.gtv-wheel-container[aria-busy="false"]').waitFor();
    await page.waitForTimeout(1500);
    const preparation = await page.evaluate(() => {
      const viewport = document.querySelector<HTMLElement>(".gtv-wheel-container")!;
      const stage = viewport.firstElementChild!;
      const r = viewport.getBoundingClientRect();
      const m = new DOMMatrixReadOnly(getComputedStyle(stage).transform);
      if (!window.__dragRendererNodes) throw new Error("Missing diagnostic renderer-input hook");
      return { viewport: { x: r.x, y: r.y, width: r.width, height: r.height },
        initial: { x: m.e, y: m.f, k: m.a, at: performance.now() },
        dots: viewport.querySelectorAll(".gtv-node-dot").length, nodes: JSON.stringify(window.__dragRendererNodes) };
    });
    expect(preparation.viewport).toEqual({ x: 24, y: 206, width: 1152, height: 584 });
    expect(preparation.dots).toBe(1720);
    marker = await page.evaluate(() => {
      const viewport = document.querySelector(".gtv-wheel-container")!;
      const stage = viewport.firstElementChild!;
      const r = viewport.getBoundingClientRect();
      const m = new DOMMatrixReadOnly(getComputedStyle(stage).transform);
      const element = document.createElement("div");
      element.id = "drag-surface-marker";
      element.style.cssText = `position:absolute;background:rgb(255,0,255);pointer-events:none;z-index:99999;left:0;top:0;width:${16 / m.a}px;height:${16 / m.a}px`;
      stage.append(element);
      const box = element.getBoundingClientRect();
      const x = r.x + 100, y = r.y + 100;
      element.style.left = `${(x - box.x) / m.a}px`;
      element.style.top = `${(y - box.y) / m.a}px`;
      return { x, y, timeOrigin: performance.timeOrigin };
    });
    const cdp = await context.newCDPSession(page);
    cdp.on("Page.screencastFrame", frame => {
      frames.push({ data: frame.data, metadata: frame.metadata });
      void cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(error => errors.push(String(error)));
    });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 50, everyNthFrame: 1 });
    await expect.poll(() => frames.length).toBeGreaterThan(0);
    // The first CDP frame may precede marker composition. Force a stationary
    // visual update and require a decoded marker before sending any pressed input.
    await page.evaluate(() => {
      document.getElementById("drag-surface-marker")!.style.outline = "1px solid black";
    });
    await expect.poll(async () => {
      const decoded = await decodeFrames(page, frames.slice(-1), marker!);
      return Boolean(decoded[0]?.point);
    }).toBe(true);
    // No preparatory pan or zoom: the first gesture is the cold drag.
    for (let index = 0; index < 3; index++) {
      const origin = await page.evaluate(() => {
        const viewport = document.querySelector(".gtv-wheel-container")!;
        const r = viewport.getBoundingClientRect();
        for (let y = r.y + 40; y < r.bottom - 40; y += 20) {
          for (let x = r.x + 40; x < r.right - 200; x += 20) {
            const hit = document.elementFromPoint(x, y);
            if (hit && viewport.contains(hit) && !hit.closest("g.node,button,foreignObject,.gtv-wheel-chip")) return { x, y };
          }
        }
        throw new Error("No background drag origin");
      });
      await page.mouse.move(origin.x, origin.y);
      await page.evaluate(({ dose, observe }) => {
        const stage = document.querySelector(".gtv-wheel-container")!.firstElementChild!;
        const read = (): Sample => {
          const m = new DOMMatrixReadOnly(getComputedStyle(stage).transform);
          return { at: performance.now(), x: m.e, y: m.f, k: m.a };
        };
        let armed = false, running = true;
        const data: Probe = { initial: read(), events: [], samples: [], injections: [], stop: () => {} };
        const record = (event: PointerEvent) => {
          data.events.push({ type: event.type, at: performance.now(), x: event.clientX, y: event.clientY, buttons: event.buttons });
          if (event.type === "pointerdown") armed = true;
          if (event.type === "pointermove" && armed && event.buttons === 1) {
            armed = false;
            const start = performance.now();
            while (performance.now() - start < dose) { /* Known blocking control. */ }
            data.injections.push({ start, end: performance.now(), requestedMs: dose });
          }
        };
        const types = ["pointerdown", "pointermove", "pointerup"] as const;
        types.forEach(type => window.addEventListener(type, record, true));
        data.stop = () => { running = false; types.forEach(type => window.removeEventListener(type, record, true)); };
        const frame = () => { if (!running) return; data.samples.push(read()); requestAnimationFrame(frame); };
        if (observe) requestAnimationFrame(frame);
        window.__dragProbe = data;
      }, { dose, observe });
      await page.mouse.down();
      await page.waitForTimeout(30);
      await page.mouse.move(origin.x + 0.7, origin.y + 2.9);
      await page.waitForTimeout(20);
      await page.mouse.move(origin.x + 2, origin.y + 6);
      await page.waitForTimeout(20);
      await page.mouse.move(origin.x + 5, origin.y + 10);
      await page.waitForTimeout(700);
      await page.mouse.move(origin.x + 80, origin.y + 10);
      await page.waitForTimeout(300);
      await page.mouse.up();
      await page.waitForTimeout(150);
      gestures.push(await page.evaluate(() => {
        const data = window.__dragProbe!;
        data.stop();
        const m = new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".gtv-wheel-container")!.firstElementChild!).transform);
        return { initial: data.initial, final: { at: performance.now(), x: m.e, y: m.f, k: m.a },
          events: data.events, samples: data.samples, injections: data.injections };
      }));
    }
    await cdp.send("Page.stopScreencast");
    const positions = await decodeFrames(page, frames, marker);
    await writeFile(info.outputPath("observations.json"), JSON.stringify({ preparation, positions }, null, 2));
    const { latencies, transforms } = analyze(gestures, positions, dose);
    for (const gesture of gestures) {
      const before = positions.filter(frame => frame.at < gesture.events[1].at && frame.point).at(-1)!;
      expect(Math.abs(before.point!.x - (marker.x + 8 + gesture.initial.x - preparation.initial.x))).toBeLessThan(1.5);
      expect(Math.abs(before.point!.y - (marker.y + 8 + gesture.initial.y - preparation.initial.y))).toBeLessThan(1.5);
    }
    expect(errors, "Browser runtime errors").toEqual([]);
    const result = { consumer, dose, observe, browser: browser.version(), preparation, gestures, positions, latencies, transforms };
    await writeFile(info.outputPath("capture.json"), JSON.stringify(result, null, 2));
    return result;
  } finally {
    await writeFile(info.outputPath("raw-frames.json.gz"), gzipSync(JSON.stringify({ marker, frames })));
    await writeFile(info.outputPath("events.json"), JSON.stringify({ gestures, errors }));
    await context.close();
  }
}

async function decodeFrames(page: Page, frames: Frame[], marker: Point & { timeOrigin: number }): Promise<Position[]> {
  const positions: Position[] = [];
  for (const frame of frames) {
    const at = Number(frame.metadata.timestamp) * 1000 - marker.timeOrigin;
    expect(Number.isFinite(at), "Missing surface timestamp").toBe(true);
    if (positions.length) expect(at, "Surface timestamps must increase").toBeGreaterThan(positions.at(-1)!.at);
    const point = await page.evaluate(async ({ data, metadata }) => {
      const bitmap = new Image();
      bitmap.src = `data:image/jpeg;base64,${data}`;
      await bitmap.decode();
      if (Math.abs(bitmap.width / metadata.deviceWidth - bitmap.height / metadata.deviceHeight) > 0.01) throw new Error("Capture aspect mismatch");
      const canvas = document.createElement("canvas");
      canvas.width = metadata.deviceWidth; canvas.height = metadata.deviceHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const { data: pixels, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, count = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (pixels[i] > 230 && pixels[i + 1] < 30 && pixels[i + 2] > 230) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); count++;
        }
      }
      if (count < 100) return null;
      if (count > 320 || maxX - minX > 20 || maxY - minY > 20) throw new Error("Ambiguous surface marker");
      return { x: (minX + maxX + 1) / 2, y: (minY + maxY + 1) / 2, count };
    }, frame);
    positions.push({ at, point });
  }
  return positions;
}

export function analyze(gestures: Gesture[], positions: Position[], dose: number) {
  const transforms: (number | null)[] = [];
  const latencies = gestures.map((gesture) => {
    expect(gesture.events.map(event => event.type)).toEqual(["pointerdown", "pointermove", "pointermove", "pointermove", "pointermove", "pointerup"]);
    const [down, move, second, third, last, up] = gesture.events;
    for (const [event, dx, dy] of [[move, 0.7, 2.9], [second, 2, 6], [third, 5, 10], [last, 80, 10]] as const) {
      expect(event.x - down.x).toBeCloseTo(dx, 1);
      expect(event.y - down.y).toBeCloseTo(dy, 1);
    }
    expect(gesture.final, "Missing final transform").toBeDefined();
    expect(gesture.final!.x - gesture.initial.x).toBeCloseTo(80, 0);
    expect(gesture.final!.y - gesture.initial.y).toBeCloseTo(10, 0);
    expect(gesture.final!.k).toBeCloseTo(gesture.initial.k, 6);
    expect([down, move, second, third, last].every(event => event.buttons === 1) && up.buttons === 0).toBe(true);
    for (let index = 1; index < gesture.events.length; index++) expect(gesture.events[index].at).toBeGreaterThan(gesture.events[index - 1].at);
    expect(gesture.injections).toHaveLength(1);
    const injection = gesture.injections[0];
    expect(injection.requestedMs).toBe(dose);
    expect(injection.start).toBeGreaterThanOrEqual(move.at);
    expect(injection.end - injection.start).toBeGreaterThanOrEqual(dose);
    expect(injection.end - injection.start).toBeLessThan(dose + 1000);
    const before = positions.filter(frame => frame.at < move.at && frame.point).at(-1);
    expect(before, "Missing stationary pre-input marker frame").toBeDefined();
    const prior = positions.filter(frame => frame.at <= down.at && frame.point).at(-1);
    expect(prior, "Missing pre-down marker frame").toBeDefined();
    expect(Math.hypot(prior!.point!.x - before!.point!.x, prior!.point!.y - before!.point!.y)).toBeLessThan(1.5);
    const moved = positions.find(frame => frame.at >= move.at && frame.at <= up.at && frame.point &&
      Math.hypot(frame.point.x - before!.point!.x, frame.point.y - before!.point!.y) > 1.5);
    expect(moved, "Missing moved surface observation").toBeDefined();
    const latency = moved!.at - move.at;
    expect(latency, "Surface precedes injected delay").toBeGreaterThanOrEqual(dose - 2);
    const transform = gesture.samples.find(sample => Math.hypot(sample.x - gesture.initial.x, sample.y - gesture.initial.y) > 1);
    transforms.push(transform ? transform.at - move.at : null);
    return latency;
  });
  return { latencies, transforms };
}
