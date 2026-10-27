import { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";

/** Genres a genre can move under: not itself, not its current parent, and not a descendant (which would form a cycle). */
export const getReparentCandidates = (
  genrePlaylists: CriteriaPlaylistSimple[],
  genreUuid: string,
): CriteriaPlaylistSimple[] => {
  const parentUuidByUuid = new Map(genrePlaylists.map((genrePlaylist) => [genrePlaylist.uuid, genrePlaylist.parent?.uuid]));
  const currentParentUuid = parentUuidByUuid.get(genreUuid);

  const isDescendant = (uuid: string): boolean => {
    const seen = new Set<string>();
    let ancestorUuid = parentUuidByUuid.get(uuid);
    while (ancestorUuid && !seen.has(ancestorUuid)) {
      if (ancestorUuid === genreUuid) return true;
      seen.add(ancestorUuid);
      ancestorUuid = parentUuidByUuid.get(ancestorUuid);
    }
    return false;
  };

  return genrePlaylists.filter(
    (genrePlaylist) =>
      genrePlaylist.uuid !== genreUuid && genrePlaylist.uuid !== currentParentUuid && !isDescendant(genrePlaylist.uuid),
  );
};
