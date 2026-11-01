"use client";

import { useState } from "react";
import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";
import { searchGenrePlaylistsByName } from "./lib/genre-search";

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

export function useGenreSearch<T extends CriteriaPlaylistSimple = CriteriaPlaylistSimple>({
  genrePlaylists,
  onSelect,
  selectedName = null,
  onClear,
}: UseGenreSearchOptions<T>): UseGenreSearchResult<T> {
  const [query, setQuery] = useState(selectedName ?? "");
  const [prevSelectedName, setPrevSelectedName] = useState(selectedName);
  if (selectedName !== prevSelectedName) {
    setPrevSelectedName(selectedName);
    setQuery(selectedName ?? "");
  }

  const results = query !== "" && query !== selectedName ? searchGenrePlaylistsByName(genrePlaylists, query) : [];

  return {
    query,
    setQuery,
    results,
    canClear: query !== "" || selectedName !== null,
    clear: () => {
      setQuery("");
      onClear?.();
    },
    select: (genrePlaylist) => {
      // A new pick refills the query via the selectedName change; re-picking the shown genre does not change it.
      setQuery(genrePlaylist.name === selectedName ? selectedName : "");
      onSelect(genrePlaylist);
    },
  };
}
