import { fileURLToPath } from "node:url";
import { coverageConfigDefaults, defineConfig } from "vitest/config";

const appKitSrc = (subpath: string) => fileURLToPath(new URL(`../app-kit/src/${subpath}/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@behindthemusictree\/app-kit\/(transport|auth|popup|player|genre-tree)$/, replacement: appKitSrc("$1") },
      {
        find: "@behindthemusictree/app-kit/genre-tree/testing",
        replacement: fileURLToPath(new URL("../app-kit/src/genre-tree/testing.ts", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**"],
      exclude: [...coverageConfigDefaults.exclude, "scripts/**"],
      thresholds: {
        lines: 99,
        functions: 100,
        branches: 98,
        statements: 99,
      },
    },
  },
});
