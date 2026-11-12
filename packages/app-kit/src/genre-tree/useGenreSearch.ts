"use client";

import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";
import { useDeferredValue, useMemo } from "react";
import { createNameIndex, rankNameIndex } from "./lib/search-text";
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
  const index = useMemo(
    () => createNameIndex(genrePlaylists, (playlist) => playlist.name, (playlist) => playlist.viewsCount ?? 0),
    [genrePlaylists],
  );
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(
    () => isTyping ? rankNameIndex(index, deferredQuery) : [],
    [index, deferredQuery, isTyping],
  );

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
