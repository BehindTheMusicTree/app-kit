import { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";
import { CriteriaMinimum } from "../schemas/criteria/minimum";
import { GenrePlaylistUuid } from "../schemas/ids";

export type ReparentCandidate = CriteriaPlaylistSimple & { criteria: CriteriaMinimum };

const hasCriteria = (genrePlaylist: CriteriaPlaylistSimple): genrePlaylist is ReparentCandidate =>
  genrePlaylist.criteria !== null;

/**
 * Genres a genre can move under: not itself, not its current parent, not a descendant (which would form a cycle),
 * and not a criteria-less playlist (the "Genreless" root), which has no genre to reparent under.
 */
export const getReparentCandidates = (
  genrePlaylists: CriteriaPlaylistSimple[],
  genrePlaylistUuid: GenrePlaylistUuid,
): ReparentCandidate[] => {
  const parentUuidByUuid = new Map(genrePlaylists.map((genrePlaylist) => [genrePlaylist.uuid, genrePlaylist.parent?.uuid]));
  const currentParentUuid = parentUuidByUuid.get(genrePlaylistUuid);

  const isDescendant = (uuid: GenrePlaylistUuid): boolean => {
    const seen = new Set<GenrePlaylistUuid>();
    let ancestorUuid = parentUuidByUuid.get(uuid);
    while (ancestorUuid && !seen.has(ancestorUuid)) {
      if (ancestorUuid === genrePlaylistUuid) return true;
      seen.add(ancestorUuid);
      ancestorUuid = parentUuidByUuid.get(ancestorUuid);
    }
    return false;
  };

  return genrePlaylists
    .filter(hasCriteria)
    .filter(
      (genrePlaylist) =>
        genrePlaylist.uuid !== genrePlaylistUuid &&
        genrePlaylist.uuid !== currentParentUuid &&
        !isDescendant(genrePlaylist.uuid),
    );
};
