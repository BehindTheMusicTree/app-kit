import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./latency",
  testMatch: "pipeline.spec.ts",
  outputDir: "./pipeline-results",
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 120_000,
  reporter: "list",
  projects: [
    { name: "chromium-headless", use: { channel: "chromium" } },
    { name: "chromium-headless-shell", use: { channel: undefined } },
  ],
});
