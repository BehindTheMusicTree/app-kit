import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..");

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });

describe("panel section frame", () => {
  // The frame (padding, title, border) lives in @behindthemusictree/ui's PanelSection. The
  // gtv-info-panel-* classes belong to genre-tree-view's tree content and are not a host contract:
  // genre-tree-view 8.0.0 dropped the section rule and silently unstyled every section built on it.
  it("builds sections with PanelSection, never with gtv-info-panel-* classes", () => {
    const offenders = sourceFiles(SRC_ROOT).filter((file) => /gtv-info-panel/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
