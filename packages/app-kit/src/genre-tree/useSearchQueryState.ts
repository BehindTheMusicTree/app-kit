"use client";

import { useState } from "react";

export interface UseSearchQueryStateOptions {
  /** Name of the currently selected item; fills the query whenever it changes. */
  selectedName?: string | null;
  /** Called by `clear`, after it empties the query. */
  onClear?: () => void;
}

export interface UseSearchQueryStateResult {
  query: string;
  setQuery: (query: string) => void;
  /** True when the query is a typed one, not the refill from the selection. */
  isTyping: boolean;
  /** Whether there is anything to clear (a typed query or a selected item). */
  canClear: boolean;
  clear: () => void;
  /** Call when an item is picked; refills the query via `selectedName` once the selection changes. */
  notifyPick: (pickedName: string) => void;
}

/** Query text of a search box and its link to the selected item; independent of where results come from. */
export function useSearchQueryState({ selectedName = null, onClear }: UseSearchQueryStateOptions = {}): UseSearchQueryStateResult {
  const [query, setQuery] = useState(selectedName ?? "");
  const [prevSelectedName, setPrevSelectedName] = useState(selectedName);
  if (selectedName !== prevSelectedName) {
    setPrevSelectedName(selectedName);
    setQuery(selectedName ?? "");
  }

  return {
    query,
    setQuery,
    isTyping: query !== "" && query !== selectedName,
    canClear: query !== "" || selectedName !== null,
    clear: () => {
      setQuery("");
      onClear?.();
    },
    notifyPick: (pickedName) => {
      // A new pick refills the query via the selectedName change; re-picking the shown item does not change it.
      setQuery(pickedName === selectedName ? selectedName : "");
    },
  };
}
