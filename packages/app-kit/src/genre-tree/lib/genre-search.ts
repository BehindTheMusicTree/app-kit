import { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";
import { rankByName } from "./search-text";

/** Ranked, accent-insensitive name match (exact, prefix, substring, fuzzy). An empty/whitespace query matches nothing. */
export const searchGenrePlaylistsByName = <T extends CriteriaPlaylistSimple>(genrePlaylists: T[], query: string): T[] =>
  rankByName(genrePlaylists, query, (genrePlaylist) => genrePlaylist.name, (genrePlaylist) => genrePlaylist.viewsCount ?? 0);
