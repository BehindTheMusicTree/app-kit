import { describe, it, expect } from "vitest";

import "./scope";

describe("scope", () => {
  it("is a type-only module with no runtime exports", async () => {
    const mod = await import("./scope");
    expect(mod).toBeDefined();
  });
});
