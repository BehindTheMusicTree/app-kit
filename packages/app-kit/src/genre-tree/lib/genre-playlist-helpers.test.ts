import { describe, it, expect } from "vitest";
import { getGenrePlaylistsGroupedByRoot, hasMainstreamPopRoot } from "./genre-playlist-helpers";
import type { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";
import type { GenreTreeNode } from "@behindthemusictree/genre-tree-view";

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

const makeNode = (overrides: Partial<GenreTreeNode>): GenreTreeNode => ({
  id: "id",
  parentId: null,
  name: "name",
  itemCount: 0,
  ...overrides,
});

describe("hasMainstreamPopRoot", () => {
  it("returns false for an empty list", () => {
    expect(hasMainstreamPopRoot([])).toBe(false);
  });

  it("returns true when a root node is named exactly 'Mainstream Pop'", () => {
    const nodes = [makeNode({ id: "root1", parentId: null, name: "Mainstream Pop" })];

    expect(hasMainstreamPopRoot(nodes)).toBe(true);
  });

  it("returns false when 'Mainstream Pop' exists but is not a root", () => {
    const nodes = [makeNode({ id: "child1", parentId: "root1", name: "Mainstream Pop" })];

    expect(hasMainstreamPopRoot(nodes)).toBe(false);
  });

  it("returns false when a root exists with a different name", () => {
    const nodes = [makeNode({ id: "root1", parentId: null, name: "Rock" })];

    expect(hasMainstreamPopRoot(nodes)).toBe(false);
  });
});
