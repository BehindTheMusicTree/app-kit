import { describe, it, expect } from "vitest";
import { searchGenrePlaylistsByName } from "./genre-search";
import { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";

const makeGenrePlaylist = (name: string): CriteriaPlaylistSimple => ({
  uuid: name,
  name,
  criteria: null,
  parent: null,
  root: { uuid: "root", name: "root" },
  tracksCount: 0,
  createdOn: "2026-01-01T00:00:00Z",
  updatedOn: null,
});

describe("searchGenrePlaylistsByName", () => {
  const genrePlaylists = [
    makeGenrePlaylist("Deep House"),
    makeGenrePlaylist("Tech House"),
    makeGenrePlaylist("Ambient"),
  ];

  it("returns nothing for an empty query", () => {
    expect(searchGenrePlaylistsByName(genrePlaylists, "")).toEqual([]);
  });

  it("returns nothing for a whitespace-only query", () => {
    expect(searchGenrePlaylistsByName(genrePlaylists, "   ")).toEqual([]);
  });

  it("matches case-insensitively", () => {
    expect(searchGenrePlaylistsByName(genrePlaylists, "house")).toEqual([
      genrePlaylists[0],
      genrePlaylists[1],
    ]);
  });

  it("matches a substring anywhere in the name", () => {
    expect(searchGenrePlaylistsByName(genrePlaylists, "mbien")).toEqual([genrePlaylists[2]]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchGenrePlaylistsByName(genrePlaylists, "jazz")).toEqual([]);
  });
});
