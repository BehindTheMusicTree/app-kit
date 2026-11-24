import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./latency",
  testMatch: "analysis.spec.ts",
  outputDir: "./latency-analysis-results",
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: "list",
});
