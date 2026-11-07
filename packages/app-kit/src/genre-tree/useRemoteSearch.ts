"use client";

import { keepPreviousData, type QueryKey } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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
  /**
   * Previous results stay visible while the next query loads, but only while this scope is unchanged. Pass what
   * makes old results wrong for the new query (e.g. the playback key); omit it to always keep them.
   */
  scope?: string;
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
  { queryKey, endpoint, params, schema, context, text, enabled: extraEnabled = true, scope = "" }: UseRemoteSearchOptions<TSchema>,
): UseRemoteSearchResult<z.infer<TSchema>[number]> {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const trimmed = text.trim();
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const dataScope = useRef<string | null>(null);

  const enabled = query.length >= SEARCH_QUERY_MIN_LENGTH && extraEnabled;
  const { data, isFetching, isError, isPlaceholderData } = useQueryWithParse({
    queryKey: queryKey(query),
    queryFn: ({ signal }) => fetch(endpoint, true, false, { signal }, params(query)),
    schema,
    context,
    enabled,
    placeholderData: (previous) => (dataScope.current === scope ? keepPreviousData(previous) : undefined),
  });
  useEffect(() => {
    if (data !== undefined && !isPlaceholderData) dataScope.current = scope;
  }, [data, isPlaceholderData, scope]);

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
