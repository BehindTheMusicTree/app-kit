import { describe, it, expect } from "vitest";
import type { GenreNodeRelations } from "@behindthemusictree/genre-tree-view";
import type { CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";
import { toGenreNodeStyles } from "./toGenreNodeStyles";

const playlist = (uuid: string, criteriaUuid: string | null) =>
  ({ uuid, name: uuid, criteria: criteriaUuid ? { uuid: criteriaUuid } : null }) as unknown as CriteriaPlaylistSimple;
const node = (id: string) => ({ id, parentId: null, name: id, itemCount: 1 });
const drawn = (id: string, fill: string) => ({ node: node(id), fill, textColor: "#000000" });

describe("toGenreNodeStyles", () => {
  const playlists = [playlist("pl-pop", "g-pop"), playlist("pl-dance", "g-dance"), playlist("pl-detached", null)];

  it("keys the styles by genre uuid, not by the playlist uuid of the tree node", () => {
    const relations = {
      ...drawn("pl-pop", "#111111"),
      parentNode: null,
      childNodes: [drawn("pl-dance", "#222222")],
      ancestorNodes: [],
    } as unknown as GenreNodeRelations;

    const styles = toGenreNodeStyles(relations, playlists);

    expect(styles.get("g-pop" as never)).toEqual({ fill: "#111111", textColor: "#000000" });
    expect(styles.get("g-dance" as never)).toEqual({ fill: "#222222", textColor: "#000000" });
    expect(styles.has("pl-pop" as never)).toBe(false);
  });

  it("skips detached playlists, which have no genre", () => {
    const relations = {
      ...drawn("pl-pop", "#111111"),
      parentNode: drawn("pl-detached", "#333333"),
      childNodes: [],
      ancestorNodes: [],
    } as unknown as GenreNodeRelations;

    expect(toGenreNodeStyles(relations, playlists).size).toBe(1);
  });

  it("is empty without a mounted tree", () => {
    expect(toGenreNodeStyles(null, playlists).size).toBe(0);
  });
});
