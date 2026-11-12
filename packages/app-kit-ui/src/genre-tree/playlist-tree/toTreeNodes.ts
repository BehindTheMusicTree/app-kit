import type { GenreTreeNode } from "@behindthemusictree/genre-tree-view";
import type { CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";
import { genrePlaylistSize, type GenreTreeSizeMetric } from "./size-metric";

/** The tree nodes of a set of genre playlists, as every tree renderer and the host's detail panel see them. */
export function toTreeNodes(
  genrePlaylists: CriteriaPlaylistSimple[],
  sizeMetric: GenreTreeSizeMetric,
  /** The open artist's footprint: every node outside it is muted. Omit it to mute nothing. */
  focusUuids?: ReadonlySet<string>,
): GenreTreeNode[] {
  return genrePlaylists.map((genrePlaylist) => ({
    id: genrePlaylist.uuid,
    parentId: genrePlaylist.parent?.uuid ?? null,
    name: genrePlaylist.name,
    itemCount: genrePlaylistSize(genrePlaylist, sizeMetric),
    actionable: Boolean(genrePlaylist.criteria),
    detached: !genrePlaylist.criteria,
    side: genrePlaylist.criteria?.side ?? undefined,
    wikidataId: genrePlaylist.criteria?.wikidataId ?? null,
    umbrella: genrePlaylist.isUmbrella,
    scene: genrePlaylist.scene ?? undefined,
    muted: focusUuids ? !focusUuids.has(genrePlaylist.uuid) : undefined,
  }));
}
