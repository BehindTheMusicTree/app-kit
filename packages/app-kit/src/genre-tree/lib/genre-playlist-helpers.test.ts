import { describe, it, expect } from "vitest";
import { getGenrePlaylistsGroupedByRoot } from "./genre-playlist-helpers";
import type { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";

const makePlaylist = (uuid: string, rootUuid: string): CriteriaPlaylistSimple =>
  ({
    uuid,
    root: { uuid: rootUuid },
  }) as CriteriaPlaylistSimple;

describe("getGenrePlaylistsGroupedByRoot", () => {
  it("returns an empty object for an empty list", () => {
    expect(getGenrePlaylistsGroupedByRoot([])).toEqual({});
  });

  it("groups a single playlist under its root uuid", () => {
    const playlist = makePlaylist("p1", "root1");

    expect(getGenrePlaylistsGroupedByRoot([playlist])).toEqual({ root1: [playlist] });
  });

  it("groups multiple playlists sharing the same root into one array", () => {
    const p1 = makePlaylist("p1", "root1");
    const p2 = makePlaylist("p2", "root1");

    expect(getGenrePlaylistsGroupedByRoot([p1, p2])).toEqual({ root1: [p1, p2] });
  });

  it("keeps playlists with different roots in separate groups", () => {
    const p1 = makePlaylist("p1", "root1");
    const p2 = makePlaylist("p2", "root2");

    expect(getGenrePlaylistsGroupedByRoot([p1, p2])).toEqual({ root1: [p1], root2: [p2] });
  });
});
