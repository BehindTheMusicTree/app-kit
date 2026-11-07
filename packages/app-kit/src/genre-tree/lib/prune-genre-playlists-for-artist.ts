import { GenreCatalogueCountsSchema } from "../schemas/genre-music";
import { genreMusicCount } from "./genre-music-selection";
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
    if (isPopRoot || (countByPlaylist.get(playlist.uuid)?.catalogue.genreAndSubgenresTracksCount.all ?? 0) > 0) kept.add(playlist.uuid);
  }
  const coreElectronicUuids = new Set(
    playlists.filter((playlist) => playlist.name === CORE_ELECTRONIC_NAME && kept.has(playlist.uuid)).map((p) => p.uuid),
  );
  for (const playlist of playlists) {
    if (playlist.parent && coreElectronicUuids.has(playlist.parent.uuid)) kept.add(playlist.uuid);
  }
  return playlists
    .filter((playlist) => kept.has(playlist.uuid))
    .map((playlist) => {
      const count = countByPlaylist.get(playlist.uuid);
      const catalogue = GenreCatalogueCountsSchema.parse(playlist.catalogue);
      const scopes = playlist.genreAndSubgenresTracksCount;
      if (!scopes) throw new Error("Artist projections require a reference genre summary");
      const zero = { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: "canonical" in scopes ? { canonical: 0, regional: 0, all: 0 } : { all: 0 } };
      return {
        ...playlist,
        genreOnlyTracksCount: count?.genreOnlyTracksCount ?? 0,
        genreAndSubgenresTracksCount: count?.genreAndSubgenresTracksCount ?? zero.genreAndSubgenresTracksCount,
        catalogue: count?.catalogue ?? { ...catalogue, ...zero },
        tracksCount: count ? genreMusicCount(count) : 0,
        // Artist view totals are not served.
        viewsCount: undefined,
      };
    });
};
