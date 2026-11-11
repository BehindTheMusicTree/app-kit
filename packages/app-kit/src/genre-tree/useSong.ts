"use client";

import { z } from "zod";

import { usePlaybackQuery } from "../transport/lib/use-playback-query";
import { resourceRetry, toResourceResult, type ResourceResult } from "../transport/lib/resource-result";
import { SongDetailedSchema, type SongDetailed } from "./schemas/song/detailed";
import { libraryEndpoints, libraryQueryKeys } from "./api/library";

export type UseSongResult =
  | Exclude<ResourceResult<SongDetailed>, { status: "success" }>
  | { status: "success"; song: SongDetailed };

export function useSong(uuid: string | null, getBackendBaseUrl: () => string): UseSongResult {
  // grow-api answers 400 to a malformed uuid; treat it as not found, and never put a raw URL value in the path.
  const isUuid = uuid !== null && z.string().uuid().safeParse(uuid).success;
  const { data, isPending, error } = usePlaybackQuery({
    getBackendBaseUrl,
    queryKey: libraryQueryKeys.reference.songs.detail(uuid),
    queryFn: (fetchBound, { signal }) =>
      fetchBound(libraryEndpoints.reference.songs.detail(uuid as string), true, false, { signal }),
    schema: SongDetailedSchema,
    enabled: isUuid,
    retry: resourceRetry,
    context: "useSong",
  });

  const result = toResourceResult({ id: uuid, isValidId: isUuid, data, error, isPending });
  return result.status === "success" ? { status: "success", song: result.data } : result;
}
