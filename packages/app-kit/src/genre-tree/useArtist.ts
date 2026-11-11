"use client";

import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { resourceRetry, toResourceResult, type ResourceResult } from "../transport/lib/resource-result";
import { ArtistDetailedSchema, type ArtistDetailed } from "./schemas/artist-detailed";
import { toArtistUuid } from "./schemas/ids";
import { artistEndpoints, artistQueryKeys } from "./api/artists";

export type UseArtistResult =
  | Exclude<ResourceResult<ArtistDetailed>, { status: "success" }>
  | { status: "success"; artist: ArtistDetailed };

/** `null` = absent (idle); any string is validated, and a malformed one is not found without a request. */
export function useArtist(uuid: string | null, getBackendBaseUrl: () => string): UseArtistResult {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  // grow-api answers 400 to a malformed uuid; treat it as not found, and never put a raw URL value in the path.
  const id = toArtistUuid(uuid);
  const isUuid = id !== null;
  const { data, isPending, error } = useQueryWithParse({
    queryKey: artistQueryKeys.detail(id),
    queryFn: () => fetch(artistEndpoints.detail(id as string), true, false),
    schema: ArtistDetailedSchema,
    enabled: isUuid,
    retry: resourceRetry,
    context: "useArtist",
  });

  const result = toResourceResult({ id: uuid, isValidId: isUuid, data, error, isPending });
  return result.status === "success" ? { status: "success", artist: result.data } : result;
}
