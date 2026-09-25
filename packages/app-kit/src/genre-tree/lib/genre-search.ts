import { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";

/** Case-insensitive substring match on genre name. An empty/whitespace query matches nothing. */
export const searchGenrePlaylistsByName = (
  genrePlaylists: CriteriaPlaylistSimple[],
  query: string,
): CriteriaPlaylistSimple[] => {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return [];

  return genrePlaylists.filter((genrePlaylist) =>
    genrePlaylist.name.toLowerCase().includes(trimmedQuery),
  );
};
