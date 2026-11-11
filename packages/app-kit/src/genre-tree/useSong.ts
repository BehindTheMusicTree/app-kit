"use client";

import { usePlaybackQuery } from "../transport/lib/use-playback-query";
import { resourceRetry, toResourceResult, type ResourceResult } from "../transport/lib/resource-result";
import { SongDetailedSchema, type SongDetailed } from "./schemas/song/detailed";
import { toSongUuid } from "./schemas/ids";
import { libraryEndpoints, libraryQueryKeys } from "./api/library";

export type UseSongResult =
  | Exclude<ResourceResult<SongDetailed>, { status: "success" }>
  | { status: "success"; song: SongDetailed };

/** `null` = absent (idle); any string is validated, and a malformed one is not found without a request. */
export function useSong(uuid: string | null, getBackendBaseUrl: () => string): UseSongResult {
  // grow-api answers 400 to a malformed uuid; treat it as not found, and never put a raw URL value in the path.
  const id = toSongUuid(uuid);
  const isUuid = id !== null;
  const { data, isPending, error } = usePlaybackQuery({
    getBackendBaseUrl,
    queryKey: libraryQueryKeys.reference.songs.detail(id),
    queryFn: (fetchBound, { signal }) =>
      fetchBound(libraryEndpoints.reference.songs.detail(id as string), true, false, { signal }),
    schema: SongDetailedSchema,
    enabled: isUuid,
    retry: resourceRetry,
    context: "useSong",
  });

  const result = toResourceResult({ id: uuid, isValidId: isUuid, data, error, isPending });
  return result.status === "success" ? { status: "success", song: result.data } : result;
}
