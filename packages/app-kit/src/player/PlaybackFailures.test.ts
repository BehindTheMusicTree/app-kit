import { describe, expect, it } from "vitest";
import { PlaybackFailures } from "./PlaybackFailures";

describe("PlaybackFailures", () => {
  it("isolates video failures by context and expires them after ten minutes", () => {
    const failures = new PlaybackFailures();
    failures.add("video", "FR", 0);
    expect(failures.has("video", "FR", 599_999)).toBe(true);
    expect(failures.has("video", "AL", 1)).toBe(false);
    expect(failures.has("replacement", "FR", 1)).toBe(false);
    expect(failures.has("video", "FR", 600_000)).toBe(false);
  });
  it("bounds entries and supports explicit retries", () => {
    const failures = new PlaybackFailures();
    for (let index = 0; index <= 200; index++) failures.add(String(index), null, 0);
    expect(failures.has("0", null, 1)).toBe(false);
    expect(failures.has("200", null, 1)).toBe(true);
    failures.clear();
    expect(failures.has("200", null, 1)).toBe(false);
  });
});
