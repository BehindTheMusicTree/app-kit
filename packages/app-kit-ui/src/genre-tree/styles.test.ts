import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

describe("genre-tree styles re-export", () => {
  it("resolves to genre-tree-view's stylesheet through its exports map", () => {
    const cssPath = createRequire(import.meta.url).resolve("@behindthemusictree/genre-tree-view/styles.css");

    expect(readFileSync(cssPath, "utf8")).toContain(".gtv-wheel-skeleton");
  });
});
