import type { GenreNodeRelations, GenreNodeStyle } from "@behindthemusictree/genre-tree-view";
import type { CriteriaPlaylistSimple, GenreUuid } from "@behindthemusictree/app-kit/genre-tree";

/**
 * How the tree draws the selected genre and its relatives, keyed by genre uuid.
 * Tree nodes are keyed by genre playlist uuid, a different id space, so the detail panel cannot look them up directly.
 */
export function toGenreNodeStyles(
  relations: GenreNodeRelations | null,
  genrePlaylists: CriteriaPlaylistSimple[],
): ReadonlyMap<GenreUuid, GenreNodeStyle> {
  const styles = new Map<GenreUuid, GenreNodeStyle>();
  if (!relations) return styles;
  const genreUuidByPlaylistUuid = new Map<string, GenreUuid>(
    genrePlaylists.flatMap((genrePlaylist) => (genrePlaylist.criteria ? [[genrePlaylist.uuid, genrePlaylist.criteria.uuid] as const] : [])),
  );
  const drawn = [relations, relations.parentNode, ...relations.childNodes, ...relations.ancestorNodes];
  for (const entry of drawn) {
    const genreUuid = entry && genreUuidByPlaylistUuid.get(entry.node.id);
    if (entry && genreUuid) styles.set(genreUuid, { fill: entry.fill, textColor: entry.textColor });
  }
  return styles;
}
