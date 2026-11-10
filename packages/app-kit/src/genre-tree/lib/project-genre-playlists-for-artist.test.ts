import { describe, it, expect } from "vitest";
import { projectGenrePlaylistsForArtist } from "./project-genre-playlists-for-artist";
import type { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";
import type { ArtistGenreCount } from "../schemas/artist-genre-count";

const make = (uuid: string, name: string, parent: string | null = null) =>
  ({
    uuid,
    name,
    parent: parent ? { uuid: parent } : null,
    root: { uuid: parent ?? uuid },
    criteria: { uuid: `c-${uuid}` },
    tracksCount: 100,
    genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { canonical: 100, regional: 0, all: 100 },
    catalogue: { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { canonical: 100, regional: 0, all: 100 } },
  }) as unknown as CriteriaPlaylistSimple;

const count = (genrePlaylist: string, songsCount: number, tracksCount = songsCount) =>
  ({ genrePlaylist, songsCount, tracksCount,
    genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { canonical: tracksCount, regional: 0, all: tracksCount },
    catalogue: { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { canonical: songsCount, regional: 0, all: songsCount } } }) as unknown as ArtistGenreCount;

const pop = make("pop", "Mainstream Pop");
const rock = make("rock", "Rock", "pop");
const punk = make("punk", "Punk", "rock");
const jazz = make("jazz", "Jazz", "pop");
const core = make("core", "Core electronic");
const commercial = make("com", "Commercial", "core");
const underground = make("und", "Underground", "core");
const house = make("house", "House", "com");
const all = [pop, rock, punk, jazz, core, commercial, underground, house];

const focus = (counts: ArtistGenreCount[]) => [...projectGenrePlaylistsForArtist(all, counts).focusUuids];

describe("projectGenrePlaylistsForArtist", () => {
  it("keeps every playlist, in order", () => {
    const { genrePlaylists } = projectGenrePlaylistsForArtist(all, [count("rock", 2)]);

    expect(genrePlaylists.map((p) => p.uuid)).toEqual(all.map((p) => p.uuid));
  });

  it("focuses genres with songs and their ancestors", () => {
    expect(focus([count("pop", 2), count("rock", 2), count("punk", 2)])).toEqual(["pop", "rock", "punk"]);
  });

  it("mutes the Mainstream Pop root and Core electronic scenes outside the footprint", () => {
    expect(focus([count("jazz", 1)])).toEqual(["jazz"]);
    expect(focus([count("core", 1), count("com", 1), count("house", 1)])).toEqual(["core", "com", "house"]);
  });

  it("ignores count rows without songs in their subtree", () => {
    expect(focus([count("rock", 0, 0), count("jazz", 1)])).toEqual(["jazz"]);
  });

  it("gives an artist without genres an empty footprint", () => {
    expect(focus([])).toEqual([]);
  });

  it("gives a playlist without a count row zero counts in its own scope shape", () => {
    const unscoped = {
      ...make("und", "Underground", "core"),
      genreAndSubgenresTracksCount: { all: 4 },
      catalogue: { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { all: 4 } },
    } as unknown as CriteriaPlaylistSimple;
    const { genrePlaylists } = projectGenrePlaylistsForArtist([rock, unscoped], []);

    expect(genrePlaylists.map((p) => [p.genreAndSubgenresTracksCount, p.catalogue, p.viewsCount])).toEqual([
      [{ canonical: 0, regional: 0, all: 0 }, { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { canonical: 0, regional: 0, all: 0 } }, undefined],
      [{ all: 0 }, { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { all: 0 } }, undefined],
    ]);
  });

  it("fails fast on a playlist without a reference genre summary", () => {
    const bare = { ...make("bare", "Bare"), genreAndSubgenresTracksCount: undefined } as unknown as CriteriaPlaylistSimple;

    expect(() => projectGenrePlaylistsForArtist([bare], [])).toThrow(/genre playlist bare/);
  });

  it("gives out-of-focus playlists zero counts", () => {
    const { genrePlaylists } = projectGenrePlaylistsForArtist(all, [count("rock", 1)]);

    expect(genrePlaylists.find((p) => p.uuid === "jazz")?.tracksCount).toBe(0);
  });

  it("replaces tracksCount with the artist's playable count", () => {
    const { genrePlaylists } = projectGenrePlaylistsForArtist(all, [count("pop", 5, 3), count("rock", 5, 0)]);

    expect(genrePlaylists.slice(0, 2).map((p) => p.tracksCount)).toEqual([3, 0]);
  });

  it("does not mutate the input playlists", () => {
    projectGenrePlaylistsForArtist(all, [count("pop", 1, 1)]);

    expect(pop.tracksCount).toBe(100);
  });
});
