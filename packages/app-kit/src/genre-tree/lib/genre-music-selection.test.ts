import { describe, expect, it } from "vitest";
import { defaultGenreMusicSelection, genreMusicCount, genreMusicQueryParams, genreMusicSelectionKey, genrePlaylistTrackCount } from "./genre-music-selection";

const canonical = { genreOnlyTracksCount: 2, genreAndSubgenresTracksCount: { canonical: 5, regional: 7, all: 9 } };
const regional = { genreOnlyTracksCount: 1, genreAndSubgenresTracksCount: { all: 4 } };

describe("genre music selections", () => {
  it("uses canonical scope for canonical genres and all for regional genres", () => {
    expect(defaultGenreMusicSelection(canonical)).toEqual({ coverage: "genreAndSubgenres", subgenres: "canonical" });
    expect(defaultGenreMusicSelection(regional)).toEqual({ coverage: "genreAndSubgenres", subgenres: "all" });
    expect(genreMusicCount(canonical)).toBe(5);
    expect(genreMusicCount(regional)).toBe(4);
  });

  it("selects complete counts without adding overlapping scopes", () => {
    expect(genreMusicCount(canonical, { coverage: "genreOnly" })).toBe(2);
    expect(genreMusicCount(canonical, { coverage: "genreAndSubgenres", subgenres: "regional" })).toBe(7);
    expect(genreMusicCount(canonical, { coverage: "genreAndSubgenres", subgenres: "all" })).toBe(9);
    expect(() => genreMusicCount(regional, { coverage: "genreAndSubgenres", subgenres: "canonical" })).toThrow("Regional");
  });

  it("encodes query params and distinct cache identities", () => {
    expect(genreMusicQueryParams()).toEqual({});
    expect(genreMusicSelectionKey()).toEqual([]);
    expect(genreMusicQueryParams({ coverage: "genreOnly" })).toEqual({ coverage: "genre_only" });
    expect(genreMusicSelectionKey({ coverage: "genreOnly" })).toEqual(["genreOnly"]);
    for (const subgenres of ["canonical", "regional", "all"] as const) {
      const selection = { coverage: "genreAndSubgenres" as const, subgenres };
      expect(genreMusicQueryParams(selection)).toEqual({ coverage: "genre_and_subgenres", subgenres });
      expect(genreMusicSelectionKey(selection)).toEqual(["genreAndSubgenres", subgenres]);
    }
  });

  it("uses explicit membership when present and preserves personal playlist totals", () => {
    expect(genrePlaylistTrackCount({ tracksCount: 99, ...canonical })).toBe(5);
    expect(genrePlaylistTrackCount({ tracksCount: 99 })).toBe(99);
    expect(() => genrePlaylistTrackCount({ tracksCount: 99, genreOnlyTracksCount: 2 })).toThrow("Incomplete");
    expect(() => genrePlaylistTrackCount({ tracksCount: 99, genreAndSubgenresTracksCount: { all: 2 } })).toThrow("Incomplete");
  });
});
