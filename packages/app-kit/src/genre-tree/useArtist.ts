"use client";

import { z } from "zod";

import { AppError, ErrorCode } from "../transport/app-errors";
import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { ArtistDetailedSchema, type ArtistDetailed } from "./schemas/artist-detailed";
import { artistEndpoints, artistQueryKeys } from "./api/artists";

const isNotFound = (error: Error | null) => error instanceof AppError && error.code === ErrorCode.BACKEND_NOT_FOUND;

export type UseArtistResult =
  | { status: "idle" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "loading" }
  | { status: "success"; artist: ArtistDetailed };

export function useArtist(uuid: string | null, getBackendBaseUrl: () => string): UseArtistResult {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  // grow-api answers 400 to a malformed uuid; treat it as not found, and never put a raw URL value in the path.
  const isUuid = uuid !== null && z.string().uuid().safeParse(uuid).success;
  const { data, isPending, error } = useQueryWithParse({
    queryKey: artistQueryKeys.detail(uuid),
    // A missing artist is shown in the panel, not raised as an app-wide connectivity error.
    queryFn: () => fetch(artistEndpoints.detail(uuid as string), true, false, undefined, undefined, false, true),
    schema: ArtistDetailedSchema,
    enabled: isUuid,
    retry: (failureCount, retryError) => !isNotFound(retryError) && failureCount < 3,
    context: "useArtist",
  });

  if (uuid === null) return { status: "idle" };
  if (!isUuid || isNotFound(error)) return { status: "not-found" };
  if (error) return { status: "error" };
  if (isPending) return { status: "loading" };
  return { status: "success", artist: data };
}
