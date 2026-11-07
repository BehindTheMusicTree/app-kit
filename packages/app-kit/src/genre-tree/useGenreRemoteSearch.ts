"use client";

import { genreEndpoints, genreSearchQueryKeys } from "./api/genres";
import { GenreSearchResultsSchema, type GenreSearchResult, type GenreSearchTreeName } from "./schemas/genre-search";
import { useRemoteSearch } from "./useRemoteSearch";

const DEFAULT_RESULT_LIMIT = 8;

export interface UseGenreRemoteSearchOptions {
  treeName?: GenreSearchTreeName;
  limit?: number;
  enabled?: boolean;
}

export interface UseGenreRemoteSearchResult {
  genres: GenreSearchResult[];
  isError: boolean;
  settled: boolean;
  pending: boolean;
}

/** Ranked server-side genre search (`genres/search/`) across the canonical and regional trees. */
export function useGenreRemoteSearch(
  getBackendBaseUrl: () => string,
  text: string,
  { treeName, limit = DEFAULT_RESULT_LIMIT, enabled }: UseGenreRemoteSearchOptions = {},
): UseGenreRemoteSearchResult {
  const params = (q: string) => ({ q, limit, ...(treeName && { treeName }) });
  const { results, isError, settled, pending } = useRemoteSearch(getBackendBaseUrl, {
    queryKey: (q) => genreSearchQueryKeys.search(params(q)),
    endpoint: genreEndpoints.search(),
    params,
    schema: GenreSearchResultsSchema,
    context: "useGenreRemoteSearch",
    text,
    enabled,
  });
  return { genres: results, isError, settled, pending };
}
