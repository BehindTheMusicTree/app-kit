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

  it("always focuses the Mainstream Pop root, with zero counts when the artist has none there", () => {
    const { genrePlaylists, focusUuids } = projectGenrePlaylistsForArtist(all, [count("jazz", 1)]);

    expect(genrePlaylists.find((p) => p.uuid === "pop")?.tracksCount).toBe(0);
    expect([...focusUuids]).toEqual(["pop", "jazz"]);
  });

  it("focuses both scene children of a focused Core electronic", () => {
    const { genrePlaylists, focusUuids } = projectGenrePlaylistsForArtist(all, [count("core", 1), count("com", 1), count("house", 1)]);

    expect([...focusUuids].sort()).toEqual(["com", "core", "house", "pop", "und"]);
    expect(genrePlaylists.find((p) => p.uuid === "und")?.tracksCount).toBe(0);
  });

  it("leaves Core electronic and its scenes out of focus when the artist has no songs there", () => {
    expect(focus([count("rock", 1)])).toEqual(["pop", "rock"]);
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
