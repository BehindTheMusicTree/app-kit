import { describe, it, expect, vi } from "vitest";
import { createNameIndex, rankNameIndex, foldSearchText, rankByName, trigramSimilarity } from "./search-text";

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


describe("indexed ranking", () => {
  const items = ["Bossa Nová", "Bossa rock", "Nova bossa", "Bossa Nová", "Rock", "Bosa nova"].map((name, id) => ({ name, id, views: id % 3 }));
  const getName = (item: typeof items[number]) => item.name;
  const getViews = (item: typeof items[number]) => item.views;
  it.each(["", "b", "bossa", "bossa nova", "bosa nova", "rock", "jazz"])("matches original ranking for %s", (query) => {
    const expected = rankByName(items, query, getName, getViews);
    const index = createNameIndex(items, getName, getViews);
    expect(rankNameIndex(index, query)).toEqual(expected);
    for (const limit of [0, 1, 2, 8]) expect(rankNameIndex(index, query, limit)).toEqual(expected.slice(0, limit));
  });
  it("normalizes the query once and never revisits source names", () => {
    const index = createNameIndex(items, getName);
    const normalize = vi.spyOn(String.prototype, "normalize");
    rankNameIndex(index, "bossa", 8);
    expect(normalize).toHaveBeenCalledTimes(1);
    normalize.mockRestore();
  });
});
