"use client";

import { keepPreviousData } from "@tanstack/react-query";

import { useEffect, useState } from "react";

import { usePlaybackContext } from "../transport/PlaybackContext";
import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { SongSearchResultsSchema, type SongSearchResult } from "./schemas/song-search";
import { libraryEndpoints, libraryQueryKeys } from "./api/library";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 8;

export interface UseSongSearchResult {
  songs: SongSearchResult[];
  isError: boolean;
  /** True once the debounced query has caught up with the typed one and its fetch has finished. */
  settled: boolean;
  /** True from the first typed character past the minimum until results arrive or the search fails; covers the debounce. */
  pending: boolean;
}

export function useSongSearch(getBackendBaseUrl: () => string, text: string): UseSongSearchResult {
  const playback = usePlaybackContext();
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const trimmed = text.trim();
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const enabled = query.length >= MIN_QUERY_LENGTH && playback.ready;
  const { data, isFetching, isError } = useQueryWithParse({
    queryKey: [...libraryQueryKeys.reference.songs.search({ q: query, limit: RESULT_LIMIT }), ...(playback.key ? [playback.key] : [])],
    queryFn: ({ signal }) =>
      fetch(libraryEndpoints.reference.songs.search(), true, false, { signal }, { q: query, limit: RESULT_LIMIT }),
    schema: SongSearchResultsSchema,
    context: "useSongSearch",
    enabled,
    placeholderData: playback.key === null ? keepPreviousData : undefined,
  });

  const settled = enabled && !isFetching && query === trimmed;
  const failed = enabled && isError;

  return {
    songs: trimmed.length >= MIN_QUERY_LENGTH ? (data ?? []) : [],
    isError: failed,
    settled,
    pending: trimmed.length >= MIN_QUERY_LENGTH && !settled && !failed,
  };
}
