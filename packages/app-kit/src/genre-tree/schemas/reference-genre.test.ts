import { describe, expect, it } from "vitest";
import { ReferenceGenreDetailedSchema, ReferenceGenrePlaylistSchema } from "./reference-genre";
import { ArtistGenreCountSchema } from "./artist-genre-count";
import { CriteriaPlaylistMinimumSchema } from "./criteria-playlist/minimum";

const identity = { uuid: "ec29efb8-3fc6-4e3b-9f24-98e9974d7979", name: "Jazz" };
const counts = { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { canonical: 139, regional: 2, all: 140 } };
const playlist = {
  ...identity, ...counts, catalogue: counts, criteria: identity, parent: null, root: identity,
  tracksCount: 139, createdOn: "2026-01-01T00:00:00Z", updatedOn: null, isUnacceptedRoot: false,
};
const detail = {
  ...identity, catalogue: counts, criteriaPlaylist: { ...identity, ...counts },
  parent: null, root: identity, children: [], ascendants: [], descendants: [],
  summary: null, tracks: [], essentialSongs: [], tracksCount: 0, updatedOn: null,
};

describe("reference genre contracts", () => {
  it("preserves distinct catalogue and playlist summaries on tree and detail responses", () => {
    expect(ReferenceGenreDetailedSchema.parse(detail).criteriaPlaylist).toMatchObject(counts);
    expect(ReferenceGenrePlaylistSchema.parse(playlist)).toMatchObject({ ...counts, catalogue: counts });
  });

  it("requires both populations on music summaries while keeping identities minimal", () => {
    expect(CriteriaPlaylistMinimumSchema.parse(identity)).toEqual(identity);
    expect(ReferenceGenreDetailedSchema.safeParse({ ...detail, catalogue: undefined }).success).toBe(false);
    expect(ReferenceGenreDetailedSchema.safeParse({ ...detail, criteriaPlaylist: identity }).success).toBe(false);
    expect(ReferenceGenrePlaylistSchema.safeParse({ ...playlist, genreOnlyTracksCount: undefined }).success).toBe(false);
    expect(ReferenceGenrePlaylistSchema.safeParse({ ...playlist, catalogue: undefined }).success).toBe(false);
  });

  it("rejects an artist playlist selection smaller than its direct population", () => {
    const row = { genrePlaylist: identity.uuid, ...counts, catalogue: counts, tracksCount: 139, songsCount: 140 };
    expect(ArtistGenreCountSchema.safeParse(row).success).toBe(true);
    expect(ArtistGenreCountSchema.safeParse({ ...row, genreOnlyTracksCount: 3 }).success).toBe(false);
  });
});
