"use client";

import { ArtistSearchResultsSchema, ArtistSearchResult } from "./schemas/artist-search";
import { artistEndpoints, artistQueryKeys } from "./api/artists";
import { useRemoteSearch } from "./useRemoteSearch";

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
  const { results, isError, settled, pending } = useRemoteSearch(getBackendBaseUrl, {
    queryKey: artistQueryKeys.search,
    endpoint: artistEndpoints.search(),
    params: (q) => ({ q, limit: RESULT_LIMIT }),
    schema: ArtistSearchResultsSchema,
    context: "useArtistSearch",
    text,
  });
  return { artists: results, isError, settled, pending };
}
