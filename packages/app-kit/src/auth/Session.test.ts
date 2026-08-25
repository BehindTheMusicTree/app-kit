import { describe, it, expect } from "vitest";

import "./Session";

describe("Session", () => {
  it("is a type-only module with no runtime exports", async () => {
    const mod = await import("./Session");
    expect(mod).toBeDefined();
  });
});
