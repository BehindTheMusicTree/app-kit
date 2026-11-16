import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

if (!base.webServer || Array.isArray(base.webServer)) throw new Error("Expected one playground web server");

export default defineConfig({
  ...base,
  testDir: "./latency",
  testMatch: "drag.spec.ts",
  outputDir: "./latency-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  projects: [
    { name: "chromium-headless", use: { channel: "chromium" } },
    { name: "chromium-headless-shell", use: { channel: undefined } },
  ],
  use: { ...base.use, channel: undefined, browserName: "chromium", headless: true, viewport: { width: 1200, height: 814 }, trace: "off", screenshot: "off" },
  webServer: {
    ...base.webServer,
    command: base.webServer.command.replace("pnpm dev", "pnpm exec vite --config vite.latency.config.ts"),
  },
});
