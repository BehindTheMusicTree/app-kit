"use client";

import { useState } from "react";
import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";
import { searchGenrePlaylistsByName } from "./lib/genre-search";

export interface UseGenreSearchOptions {
  genrePlaylists: CriteriaPlaylistSimple[];
  onSelect: (genrePlaylist: CriteriaPlaylistSimple) => void;
  /** Name of the currently selected genre; fills the query whenever it changes. */
  selectedName?: string | null;
  /** Called by `clear`, after it empties the query. */
  onClear?: () => void;
}

export interface UseGenreSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: CriteriaPlaylistSimple[];
  /** Whether there is anything to clear (a typed query or a selected genre). */
  canClear: boolean;
  clear: () => void;
  select: (genrePlaylist: CriteriaPlaylistSimple) => void;
}

export function useGenreSearch({
  genrePlaylists,
  onSelect,
  selectedName = null,
  onClear,
}: UseGenreSearchOptions): UseGenreSearchResult {
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
