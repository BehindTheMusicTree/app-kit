"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { ArtistSearchResultsSchema, ArtistSearchResult } from "./schemas/artist-search";
import { artistEndpoints, artistQueryKeys } from "./api/artists";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 8;

export interface UseArtistSearchResult {
  artists: ArtistSearchResult[];
  isError: boolean;
  /** True once the debounced query has caught up with the typed one and its fetch has finished. */
  settled: boolean;
  /** True from the first typed character past the minimum until results arrive or the search fails; covers the debounce. */
  pending: boolean;
}

export function useArtistSearch(getBackendBaseUrl: () => string, text: string): UseArtistSearchResult {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const trimmed = text.trim();
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const enabled = query.length >= MIN_QUERY_LENGTH;
  const { data, isFetching, isError } = useQueryWithParse({
    queryKey: artistQueryKeys.search(query),
    queryFn: () => fetch(artistEndpoints.search(), true, false, {}, { q: query, limit: RESULT_LIMIT }),
    schema: ArtistSearchResultsSchema,
    context: "useArtistSearch",
    enabled,
    placeholderData: keepPreviousData,
  });

  const settled = enabled && !isFetching && query === trimmed;
  const failed = enabled && isError;

  return {
    artists: trimmed.length >= MIN_QUERY_LENGTH ? (data ?? []) : [],
    isError: failed,
    settled,
    pending: trimmed.length >= MIN_QUERY_LENGTH && !settled && !failed,
  };
}
