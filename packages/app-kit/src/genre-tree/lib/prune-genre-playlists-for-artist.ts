import type { ArtistGenreCount } from "../schemas/artist-genre-count";
import type { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";

const POP_ROOT_NAME = "Mainstream Pop";
const CORE_ELECTRONIC_NAME = "Core electronic";

/**
 * Narrows the canonical tree to an artist's footprint: nodes with songs in their subtree (which
 * includes every ancestor of such a node) carry the artist's counts. Two structural exceptions are
 * kept with zero counts: the "Mainstream Pop" root (pop-core needs it) and the scene children of a
 * kept "Core electronic" (the scene stack needs one commercial and one underground child).
 */
export const pruneGenrePlaylistsForArtist = (
  playlists: CriteriaPlaylistSimple[],
  counts: ArtistGenreCount[],
): CriteriaPlaylistSimple[] => {
  const countByPlaylist = new Map(counts.map((count) => [count.genrePlaylist as string, count]));
  const kept = new Set<string>();
  for (const playlist of playlists) {
    const isPopRoot = playlist.parent === null && playlist.name === POP_ROOT_NAME;
    if (isPopRoot || (countByPlaylist.get(playlist.uuid)?.songsCount ?? 0) > 0) kept.add(playlist.uuid);
  }
  const coreElectronicUuids = new Set(
    playlists.filter((playlist) => playlist.name === CORE_ELECTRONIC_NAME && kept.has(playlist.uuid)).map((p) => p.uuid),
  );
  for (const playlist of playlists) {
    if (playlist.parent && coreElectronicUuids.has(playlist.parent.uuid)) kept.add(playlist.uuid);
  }
  return playlists
    .filter((playlist) => kept.has(playlist.uuid))
    .map((playlist) => ({
      ...playlist,
      tracksCount: countByPlaylist.get(playlist.uuid)?.tracksCount ?? 0,
      // Per-artist view totals are not served, so the views metric is unavailable on a pruned tree.
      viewsCount: 0,
    }));
};
