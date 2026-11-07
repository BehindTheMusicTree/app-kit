"use client";

import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";
import { searchGenrePlaylistsByName } from "./lib/genre-search";
import { useSearchQueryState } from "./useSearchQueryState";

export interface UseGenreSearchOptions<T extends CriteriaPlaylistSimple = CriteriaPlaylistSimple> {
  genrePlaylists: T[];
  onSelect: (genrePlaylist: T) => void;
  /** Name of the currently selected genre; fills the query whenever it changes. */
  selectedName?: string | null;
  /** Called by `clear`, after it empties the query. */
  onClear?: () => void;
}

export interface UseGenreSearchResult<T extends CriteriaPlaylistSimple = CriteriaPlaylistSimple> {
  query: string;
  setQuery: (query: string) => void;
  results: T[];
  /** Whether there is anything to clear (a typed query or a selected genre). */
  canClear: boolean;
  clear: () => void;
  select: (genrePlaylist: T) => void;
}

/** In-memory genre search over already-loaded genre playlists. */
export function useGenreSearch<T extends CriteriaPlaylistSimple = CriteriaPlaylistSimple>({
  genrePlaylists,
  onSelect,
  selectedName = null,
  onClear,
}: UseGenreSearchOptions<T>): UseGenreSearchResult<T> {
  const { query, setQuery, isTyping, canClear, clear, notifyPick } = useSearchQueryState({ selectedName, onClear });
  const results = isTyping ? searchGenrePlaylistsByName(genrePlaylists, query) : [];

  return {
    query,
    setQuery,
    results,
    canClear,
    clear,
    select: (genrePlaylist) => {
      notifyPick(genrePlaylist.name);
      onSelect(genrePlaylist);
    },
  };
}
