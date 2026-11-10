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

describe("toTreeNodes fields", () => {
  it("maps every node field the renderers read", () => {
    const umbrella = {
      ...playlist("u"),
      parent: { uuid: "a" },
      criteria: { uuid: "c-u", side: "left", wikidataId: "Q1" },
      isUmbrella: true,
      scene: "commercial",
    } as unknown as CriteriaPlaylistSimple;
    const detached = { ...playlist("d"), criteria: null } as unknown as CriteriaPlaylistSimple;

    expect(toTreeNodes([umbrella, detached], "songs")).toEqual([
      { id: "u", parentId: "a", name: "u", itemCount: 1, actionable: true, detached: false, side: "left", wikidataId: "Q1", umbrella: true, scene: "commercial", muted: undefined },
      { id: "d", parentId: null, name: "d", itemCount: 1, actionable: false, detached: true, side: undefined, wikidataId: null, umbrella: false, scene: undefined, muted: undefined },
    ]);
  });
});
