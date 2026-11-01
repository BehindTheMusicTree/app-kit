import { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";

/** Case-insensitive substring match on genre name. An empty/whitespace query matches nothing. */
export const searchGenrePlaylistsByName = <T extends CriteriaPlaylistSimple>(genrePlaylists: T[], query: string): T[] => {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return [];

  return genrePlaylists.filter((genrePlaylist) =>
    genrePlaylist.name.toLowerCase().includes(trimmedQuery),
  );
};
