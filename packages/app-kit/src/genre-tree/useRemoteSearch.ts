"use client";

import { keepPreviousData, type QueryKey } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { z } from "zod";

import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";

export const SEARCH_DEBOUNCE_MS = 250;
/** Mirrors the API's `SEARCH_QUERY_LEN_MIN`. */
export const SEARCH_QUERY_MIN_LENGTH = 2;

export interface UseRemoteSearchOptions<TSchema extends z.ZodTypeAny> {
  /** Builds the cache key from the debounced, trimmed query. */
  queryKey: (query: string) => QueryKey;
  endpoint: string;
  /** Builds the request params from the debounced, trimmed query. */
  params: (query: string) => Record<string, string | number | boolean>;
  schema: TSchema;
  context: string;
  text: string;
  /** Extra gate besides the minimum length, e.g. playback readiness. */
  enabled?: boolean;
  /** Keep the previous results while the next query loads. */
  keepPrevious?: boolean;
}

export interface UseRemoteSearchResult<T> {
  results: T[];
  isError: boolean;
  /** True once the debounced query has caught up with the typed one and its fetch has finished. */
  settled: boolean;
  /** True from the first typed character past the minimum until results arrive or the search fails; covers the debounce. */
  pending: boolean;
}

/** Debounced typeahead against a search endpoint; the shared core of the artist, song and genre searches. */
export function useRemoteSearch<TSchema extends z.ZodType<unknown[]>>(
  getBackendBaseUrl: () => string,
  { queryKey, endpoint, params, schema, context, text, enabled: extraEnabled = true, keepPrevious = true }: UseRemoteSearchOptions<TSchema>,
): UseRemoteSearchResult<z.infer<TSchema>[number]> {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const trimmed = text.trim();
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const enabled = query.length >= SEARCH_QUERY_MIN_LENGTH && extraEnabled;
  const { data, isFetching, isError } = useQueryWithParse({
    queryKey: queryKey(query),
    queryFn: ({ signal }) => fetch(endpoint, true, false, { signal }, params(query)),
    schema,
    context,
    enabled,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });

  const settled = enabled && !isFetching && query === trimmed;
  const failed = enabled && isError;
  const long = trimmed.length >= SEARCH_QUERY_MIN_LENGTH;

  return {
    results: long ? ((data ?? []) as z.infer<TSchema>[number][]) : [],
    isError: failed,
    settled,
    pending: long && !settled && !failed,
  };
}
