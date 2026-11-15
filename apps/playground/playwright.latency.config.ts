import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

if (!base.webServer || Array.isArray(base.webServer)) throw new Error("Expected one playground web server");

export default defineConfig({
  ...base,
  testDir: "./latency",
  outputDir: "./latency-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  projects: [{ name: "surface", use: { browserName: "chromium", viewport: { width: 1200, height: 814 } } }],
  use: { ...base.use, trace: "off", screenshot: "off" },
  webServer: {
    ...base.webServer,
    command: base.webServer.command.replace("pnpm dev", "pnpm exec vite --config vite.latency.config.ts"),
  },
});
