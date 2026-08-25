import { describe, it, expect } from "vitest";
import { formatTime, capitalizeFirstLetter } from "./formatting";

describe("formatTime", () => {
  it("pads seconds under 10 with a leading zero", () => {
    expect(formatTime(65)).toBe("1:05");
  });

  it("does not pad seconds that are 10 or greater", () => {
    expect(formatTime(125)).toBe("2:05".replace("05", "05"));
    expect(formatTime(150)).toBe("2:30");
  });

  it("formats zero seconds", () => {
    expect(formatTime(0)).toBe("0:00");
  });
});

describe("capitalizeFirstLetter", () => {
  it("capitalizes the first letter of a lowercase string", () => {
    expect(capitalizeFirstLetter("genre")).toBe("Genre");
  });

  it("leaves an already-capitalized string unchanged", () => {
    expect(capitalizeFirstLetter("Genre")).toBe("Genre");
  });

  it("returns an empty string unchanged", () => {
    expect(capitalizeFirstLetter("")).toBe("");
  });
});
