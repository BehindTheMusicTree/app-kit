import { test, expect, chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const epoch = () => performance.timeOrigin + performance.now();

for (let repetition = 1; repetition <= 2; repetition++) {
  // Reverse the order on the second pass to expose warm-host effects.
  for (const trace of repetition === 1 ? [false, true] : [true, false]) {
    for (const screencast of repetition === 1 ? [false, true] : [true, false]) {
      test(`rectangle repeat=${repetition} trace=${trace} screencast=${screencast}`, async ({}, info) => {
        const browser = await chromium.launch({ channel: info.project.use.channel, headless: true });
        const frames: { data: string; at: number; arrival: number }[] = [];
        const dispatches: { gesture: number; step: number; sent: number; acknowledged?: number }[] = [];
        const clocks: { sent: number; received: number; page: { origin: number; now: number; epoch: number } }[] = [];
        try {
          const browserSession = await browser.newBrowserCDPSession();
          const environment = {
            version: await browserSession.send("Browser.getVersion"),
            commandLine: await browserSession.send("Browser.getBrowserCommandLine"),
            system: await browserSession.send("SystemInfo.getInfo"),
            platform: process.platform, architecture: process.arch,
          };
          await writeFile(info.outputPath("environment.json"), JSON.stringify(environment, null, 2));
          const page = await browser.newPage({ viewport: { width: 1200, height: 814 }, deviceScaleFactor: 1 });
          const errors: string[] = [];
          page.on("pageerror", error => errors.push(error.message));
          await page.setContent('<div id="box" style="position:absolute;left:100px;top:100px;width:16px;height:16px;background:rgb(255,0,255)"></div>');
          await page.evaluate(() => {
            const box = document.getElementById("box")!;
            const events: { type: string; at: number; timestamp: number; buttons: number; x: number }[] = [];
            const samples: { at: number; x: number }[] = [];
            let x = 0;
            for (const type of ["pointerdown", "pointermove", "pointerup"]) {
              window.addEventListener(type, event => {
                const pointer = event as PointerEvent;
                events.push({ type, at: performance.now(), timestamp: pointer.timeStamp, buttons: pointer.buttons, x: pointer.clientX });
                if (type === "pointermove" && pointer.buttons === 1) {
                  x = pointer.clientX - 100;
                  box.style.transform = `translateX(${x}px)`;
                }
              });
            }
            const frame = () => { samples.push({ at: performance.now(), x: new DOMMatrixReadOnly(getComputedStyle(box).transform).e }); requestAnimationFrame(frame); };
            requestAnimationFrame(frame);
            // A DOM property keeps this isolated probe out of application globals.
            Object.assign(box, { probe: { events, samples } });
          });
          await page.waitForTimeout(1500);
          const cdp = await page.context().newCDPSession(page);
          cdp.on("Page.screencastFrame", frame => {
            frames.push({ data: frame.data, at: Number(frame.metadata.timestamp) * 1000, arrival: epoch() });
            void cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(error => errors.push(String(error)));
          });
          if (trace) await cdp.send("Tracing.start", {
            categories: "devtools.timeline,blink.user_timing,input,cc,viz,benchmark",
            transferMode: "ReturnAsStream",
          });
          if (screencast) {
            await cdp.send("Page.startScreencast", { format: "jpeg", quality: 50, everyNthFrame: 1 });
            await expect.poll(() => frames.length).toBeGreaterThan(0);
          }
          for (let gesture = 0; gesture < 3; gesture++) {
            await page.evaluate(() => { document.getElementById("box")!.style.transform = "translateX(0px)"; });
            await page.waitForTimeout(250);
            const sent = epoch();
            const clock = await page.evaluate(() => ({ origin: performance.timeOrigin, now: performance.now(), epoch: Date.now() }));
            clocks.push({ sent, received: epoch(), page: clock });
            await page.mouse.move(100, 100);
            await page.mouse.down();
            const started = performance.now();
            const pending: Promise<unknown>[] = [];
            for (let step = 1; step <= 60; step++) {
              const wait = started + (step - 1) * 16 - performance.now();
              if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
              const dispatch: typeof dispatches[number] = { gesture, step, sent: epoch() };
              dispatches.push(dispatch);
              pending.push(cdp.send("Input.dispatchMouseEvent", {
                type: "mouseMoved", x: 100 + step * 80 / 60, y: 100, button: "left", buttons: 1,
              }).then(() => { dispatch.acknowledged = epoch(); }));
            }
            await Promise.all(pending);
            await page.waitForTimeout(1000);
            await page.mouse.up();
            await page.waitForTimeout(150);
          }
          if (screencast) await cdp.send("Page.stopScreencast");
          if (trace) {
            const completed = new Promise<{ stream?: string }>(resolve => cdp.once("Tracing.tracingComplete", resolve));
            await cdp.send("Tracing.end");
            const { stream } = await completed;
            if (!stream) throw new Error("Missing trace stream");
            const chunks: Buffer[] = [];
            try {
              for (;;) {
                const chunk = await cdp.send("IO.read", { handle: stream });
                chunks.push(Buffer.from(chunk.data, chunk.base64Encoded ? "base64" : "utf8"));
                if (chunk.eof) break;
              }
            } finally { await cdp.send("IO.close", { handle: stream }); }
            await writeFile(info.outputPath("render-trace.json.gz"), gzipSync(Buffer.concat(chunks)));
          }
          const probe = await page.evaluate(() => {
            const box = document.getElementById("box")! as HTMLElement & {
              probe: { events: { type: string; at: number; timestamp: number; buttons: number; x: number }[]; samples: { at: number; x: number }[] };
            };
            return { ...box.probe, finalX: new DOMMatrixReadOnly(getComputedStyle(box).transform).e };
          });
          // Decode after the gesture so pixel work does not affect input or rendering.
          const positions: { at: number; arrival: number; x: number | null }[] = [];
          for (const frame of frames) {
            const x = await page.evaluate(async data => {
              const bitmap = new Image();
              bitmap.src = `data:image/jpeg;base64,${data}`;
              await bitmap.decode();
              const canvas = document.createElement("canvas");
              canvas.width = 1200; canvas.height = 814;
              const context = canvas.getContext("2d")!;
              context.drawImage(bitmap, 0, 0);
              const pixels = context.getImageData(0, 100, 1200, 16).data;
              let sum = 0, count = 0;
              for (let i = 0; i < pixels.length; i += 4) {
                if (pixels[i] > 230 && pixels[i + 1] < 30 && pixels[i + 2] > 230) { sum += (i / 4) % 1200; count++; }
              }
              if (count < 100 || count > 320) return null;
              return sum / count;
            }, frame.data);
            positions.push({ at: frame.at, arrival: frame.arrival, x });
          }
          await writeFile(info.outputPath("observations.json"), JSON.stringify({ clocks, dispatches, probe, positions, errors }, null, 2));
          expect(errors).toEqual([]);
          expect(probe.finalX).toBeCloseTo(80, 1);
          const downs = probe.events.filter(event => event.type === "pointerdown");
          expect(downs).toHaveLength(3);
          for (let index = 0; index < downs.length; index++) {
            const down = downs[index];
            const events = probe.events.filter(event => event.at >= down.at && event.at < (downs[index + 1]?.at ?? Infinity));
            const upIndex = events.findIndex(event => event.type === "pointerup");
            expect(upIndex).toBeGreaterThan(1);
            const moves = events.slice(1, upIndex);
            expect(down.buttons).toBe(1);
            expect(moves.every(event => event.type === "pointermove" && event.buttons === 1)).toBe(true);
            expect(moves.at(-1)!.x - down.x).toBeCloseTo(80, 1);
            expect(events[upIndex].buttons).toBe(0);
            if (screencast) {
              const start = clocks[index].page.origin + down.at;
              const end = clocks[index].page.origin + events[upIndex].at;
              const before = positions.filter(position => position.at < start && position.x !== null).at(-1);
              expect(before?.x, "Stationary pre-input marker").toBeCloseTo(107.5, 0);
              expect(positions.some(position => position.at > start && position.at < end && position.x !== null && position.x > 109), "Moved marker during pressed gesture").toBe(true);
            }
          }
        } finally {
          await writeFile(info.outputPath("raw-frames.json.gz"), gzipSync(JSON.stringify({ frames, clocks, dispatches })));
          await browser.close();
        }
      });
    }
  }
}
