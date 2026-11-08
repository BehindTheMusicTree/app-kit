"use client";

import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { genreEndpoints, genreSearchQueryKeys } from "./api/genres";
import { RegionGenreLexiconSchema, type RegionGenreLexiconEntry } from "./schemas/genre-search";

const EMPTY_ENTRIES: RegionGenreLexiconEntry[] = [];

/** Every genre the region map index references, loaded once on demand (`regions/map/genres/`). */
export function useRegionGenreLexicon(getBackendBaseUrl: () => string, enabled: boolean) {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const { data, isError, isPending } = useQueryWithParse({
    queryKey: genreSearchQueryKeys.regionLexicon(),
    queryFn: ({ signal }) => fetch(genreEndpoints.regionLexicon(), true, false, { signal }),
    schema: RegionGenreLexiconSchema,
    context: "useRegionGenreLexicon",
    enabled,
    staleTime: Infinity,
  });
  const entries: RegionGenreLexiconEntry[] = data ?? EMPTY_ENTRIES;
  return { entries, isError, isPending: enabled && isPending };
}
