"use client";

import { z } from "zod";

import { AppError, ErrorCode } from "../transport/app-errors";
import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { SongDetailedSchema, type SongDetailed } from "./schemas/song/detailed";
import { libraryEndpoints, libraryQueryKeys } from "./api/library";

const isNotFound = (error: Error | null) => error instanceof AppError && error.code === ErrorCode.BACKEND_NOT_FOUND;

export type UseSongResult =
  | { status: "idle" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "loading" }
  | { status: "success"; song: SongDetailed };

export function useSong(uuid: string | null, getBackendBaseUrl: () => string): UseSongResult {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  // grow-api answers 400 to a malformed uuid; treat it as not found, and never put a raw URL value in the path.
  const isUuid = uuid !== null && z.string().uuid().safeParse(uuid).success;
  const { data, isPending, error } = useQueryWithParse({
    queryKey: libraryQueryKeys.reference.songs.detail(uuid),
    // A missing song is shown in the panel, not raised as an app-wide connectivity error.
    queryFn: ({ signal }) =>
      fetch(libraryEndpoints.reference.songs.detail(uuid as string), true, false, { signal }, undefined, false, true),
    schema: SongDetailedSchema,
    enabled: isUuid,
    retry: (failureCount, retryError) => !isNotFound(retryError) && failureCount < 3,
    context: "useSong",
  });

  if (uuid === null) return { status: "idle" };
  if (!isUuid || isNotFound(error)) return { status: "not-found" };
  if (error) return { status: "error" };
  if (isPending) return { status: "loading" };
  return { status: "success", song: data };
}
