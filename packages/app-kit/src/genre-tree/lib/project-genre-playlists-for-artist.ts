import { GenreCatalogueCountsSchema } from "../schemas/genre-music";
import { genreMusicCount } from "./genre-music-selection";
import type { ArtistGenreCount } from "../schemas/artist-genre-count";
import type { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";

export interface ArtistGenreProjection {
  /** Every canonical playlist, carrying the artist's counts (zero outside the footprint). */
  genrePlaylists: CriteriaPlaylistSimple[];
  /** The artist's footprint: renderers draw every other node muted instead of dropping it. */
  focusUuids: ReadonlySet<string>;
}

const ZERO_SCOPED = { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { canonical: 0, regional: 0, all: 0 } };
const ZERO_ALL = { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { all: 0 } };
const ZERO_SCOPED_CATALOGUE = GenreCatalogueCountsSchema.parse(ZERO_SCOPED);
const ZERO_ALL_CATALOGUE = GenreCatalogueCountsSchema.parse(ZERO_ALL);

/**
 * Projects an artist onto the canonical tree. No node is dropped: every playlist carries the
 * artist's counts (zero outside the footprint). The footprint is the nodes with songs in their
 * subtree, which includes every ancestor of such a node; an artist without genres has an empty
 * footprint. Since nothing is pruned, no structural node needs to be kept in focus.
 */
export const projectGenrePlaylistsForArtist = (
  playlists: CriteriaPlaylistSimple[],
  counts: ArtistGenreCount[],
): ArtistGenreProjection => {
  const countByPlaylist = new Map(counts.map((count) => [count.genrePlaylist as string, count]));
  const focusUuids = new Set(
    counts.filter((count) => count.catalogue.genreAndSubgenresTracksCount.all > 0).map((count) => count.genrePlaylist as string),
  );
  const genrePlaylists = playlists.map((playlist) => {
    const count = countByPlaylist.get(playlist.uuid);
    if (count) {
      return {
        ...playlist,
        genreOnlyTracksCount: count.genreOnlyTracksCount,
        genreAndSubgenresTracksCount: count.genreAndSubgenresTracksCount,
        catalogue: count.catalogue,
        tracksCount: genreMusicCount(count),
        // Artist view totals are not served.
        viewsCount: undefined,
      };
    }
    const scopes = playlist.genreAndSubgenresTracksCount;
    if (!scopes) throw new Error(`Artist projections require a reference genre summary (genre playlist ${playlist.uuid})`);
    const isScoped = "canonical" in scopes;
    return {
      ...playlist,
      ...(isScoped ? ZERO_SCOPED : ZERO_ALL),
      catalogue: isScoped ? ZERO_SCOPED_CATALOGUE : ZERO_ALL_CATALOGUE,
      tracksCount: 0,
      viewsCount: undefined,
    };
  });
  return { genrePlaylists, focusUuids };
};
