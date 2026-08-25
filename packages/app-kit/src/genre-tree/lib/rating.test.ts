import { describe, it, expect } from "vitest";
import { FORM_RATING_NULL_VALUE } from "./rating";

describe("FORM_RATING_NULL_VALUE", () => {
  it("is -1", () => {
    expect(FORM_RATING_NULL_VALUE).toBe(-1);
  });
});
