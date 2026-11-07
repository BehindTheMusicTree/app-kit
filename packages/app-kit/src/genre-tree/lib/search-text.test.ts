import { describe, it, expect } from "vitest";
import { foldSearchText, rankByName, trigramSimilarity } from "./search-text";

describe("foldSearchText", () => {
  it("strips diacritics, casefolds and collapses whitespace", () => {
    expect(foldSearchText("  Bossa  Nová ")).toBe("bossa nova");
  });
});

describe("trigramSimilarity", () => {
  it("is 1 for equal text and higher for closer typos", () => {
    expect(trigramSimilarity("Jazz", "jazz")).toBe(1);
    expect(trigramSimilarity("bosa nova", "bossa nova")).toBeGreaterThan(trigramSimilarity("rock", "bossa nova"));
  });
});

describe("rankByName", () => {
  const name = (item: { name: string }) => item.name;
  const item = (n: string, views = 0) => ({ name: n, views });

  it("returns nothing for an empty query", () => {
    expect(rankByName([item("Jazz")], "  ", name)).toEqual([]);
  });

  it("orders exact, prefix, substring, then fuzzy", () => {
    const items = [item("Acid House"), item("Housee"), item("House Music"), item("House"), item("Hous")];
    expect(rankByName(items, "house", name).map(name)).toEqual(["House", "House Music", "Housee", "Acid House", "Hous"]);
  });

  it("matches through accents in either direction", () => {
    expect(rankByName([item("Bossa Nová")], "nova", name)).toHaveLength(1);
    expect(rankByName([item("Cafe")], "café", name)).toHaveLength(1);
  });

  it("breaks ties on views then name", () => {
    const items = [item("House B", 1), item("House A", 1), item("House C", 9)];
    expect(rankByName(items, "house", name, (i) => i.views).map(name)).toEqual(["House C", "House A", "House B"]);
  });

  it("drops names too dissimilar to match", () => {
    expect(rankByName([item("Ambient")], "zzzz", name)).toEqual([]);
  });
});
