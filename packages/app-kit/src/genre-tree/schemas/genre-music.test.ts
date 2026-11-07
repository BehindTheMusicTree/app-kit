import { describe, expect, it } from "vitest";

import { GenreCatalogueCountsSchema, GenrePlaylistSummarySchema } from "./genre-music";

describe("genre music summaries", () => {
  it("accepts canonical and regional scopes", () => {
    expect(GenreCatalogueCountsSchema.safeParse({
      genreOnlyTracksCount: 1,
      genreAndSubgenresTracksCount: { canonical: 2, regional: 3, all: 4 },
    }).success).toBe(true);
    expect(GenrePlaylistSummarySchema.safeParse({
      uuid: "ec29efb8-3fc6-4e3b-9f24-98e9974d7979", name: "Jazz",
      genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { all: 1 },
    }).success).toBe(true);
  });

  it("rejects missing, partial and invalid counts", () => {
    for (const value of [
      {},
      { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { canonical: 1, all: 1 } },
      { genreOnlyTracksCount: -1, genreAndSubgenresTracksCount: { all: 1 } },
      { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { all: 1.5 } },
      { genreOnlyTracksCount: 2, genreAndSubgenresTracksCount: { all: 1 } },
      { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { canonical: 2, regional: 1, all: 1 } },
    ]) expect(GenreCatalogueCountsSchema.safeParse(value).success).toBe(false);
  });
});
