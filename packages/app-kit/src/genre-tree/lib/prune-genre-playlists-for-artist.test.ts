import { describe, it, expect } from "vitest";
import { pruneGenrePlaylistsForArtist } from "./prune-genre-playlists-for-artist";
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
  }) as unknown as CriteriaPlaylistSimple;

const count = (genrePlaylist: string, songsCount: number, tracksCount = songsCount) =>
  ({ genrePlaylist, songsCount, tracksCount }) as unknown as ArtistGenreCount;

const pop = make("pop", "Mainstream Pop");
const rock = make("rock", "Rock", "pop");
const punk = make("punk", "Punk", "rock");
const jazz = make("jazz", "Jazz", "pop");
const core = make("core", "Core electronic");
const commercial = make("com", "Commercial", "core");
const underground = make("und", "Underground", "core");
const house = make("house", "House", "com");
const all = [pop, rock, punk, jazz, core, commercial, underground, house];

describe("pruneGenrePlaylistsForArtist", () => {
  it("keeps genres with songs and their ancestors, dropping the rest", () => {
    const result = pruneGenrePlaylistsForArtist(all, [count("pop", 2), count("rock", 2), count("punk", 2)]);

    expect(result.map((p) => p.uuid)).toEqual(["pop", "rock", "punk"]);
  });

  it("always keeps the Mainstream Pop root, with zero counts when the artist has none there", () => {
    const result = pruneGenrePlaylistsForArtist(all, [count("jazz", 1)]);

    expect(result.find((p) => p.uuid === "pop")?.tracksCount).toBe(0);
    expect(result.map((p) => p.uuid)).toEqual(["pop", "jazz"]);
  });

  it("keeps both scene children of a kept Core electronic", () => {
    const result = pruneGenrePlaylistsForArtist(all, [count("core", 1), count("com", 1), count("house", 1)]);

    expect(result.map((p) => p.uuid)).toEqual(["pop", "core", "com", "und", "house"]);
    expect(result.find((p) => p.uuid === "und")?.tracksCount).toBe(0);
  });

  it("drops Core electronic and its scenes when the artist has no songs there", () => {
    const result = pruneGenrePlaylistsForArtist(all, [count("rock", 1)]);

    expect(result.map((p) => p.uuid)).toEqual(["pop", "rock"]);
  });

  it("replaces tracksCount with the artist's playable count", () => {
    const result = pruneGenrePlaylistsForArtist(all, [count("pop", 5, 3), count("rock", 5, 0)]);

    expect(result.map((p) => p.tracksCount)).toEqual([3, 0]);
  });

  it("does not mutate the input playlists", () => {
    pruneGenrePlaylistsForArtist(all, [count("pop", 1, 1)]);

    expect(pop.tracksCount).toBe(100);
  });
});
