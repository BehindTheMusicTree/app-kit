import { describe, it, expect } from "vitest";
import type { CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";
import { toTreeNodes } from "./toTreeNodes";

const playlist = (uuid: string) =>
  ({
    uuid,
    name: uuid,
    parent: null,
    criteria: { uuid: `c-${uuid}`, side: null, wikidataId: null },
    isUmbrella: false,
    tracksCount: 1,
    genreOnlyTracksCount: 1,
    genreAndSubgenresTracksCount: { all: 1 },
  }) as unknown as CriteriaPlaylistSimple;

describe("toTreeNodes muted", () => {
  const playlists = [playlist("a"), playlist("b")];

  it("mutes nothing without a footprint", () => {
    expect(toTreeNodes(playlists, "songs").map((node) => node.muted)).toEqual([undefined, undefined]);
  });

  it("mutes every node outside the footprint", () => {
    expect(toTreeNodes(playlists, "songs", new Set(["a"])).map((node) => node.muted)).toEqual([false, true]);
  });
});
