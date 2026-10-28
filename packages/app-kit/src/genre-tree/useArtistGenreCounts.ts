"use client";

import { z } from "zod";

import { AppError, ErrorCode } from "../transport/app-errors";
import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { ArtistGenreCountSchema } from "./schemas/artist-genre-count";
import { artistEndpoints, artistQueryKeys } from "./api/artists";

const isNotFound = (error: Error | null) => error instanceof AppError && error.code === ErrorCode.BACKEND_NOT_FOUND;

/** The artist's footprint on the canonical tree (sparse: non-zero genre playlists only). Idle while `artistUuid` is null. */
export function useArtistGenreCounts(artistUuid: string | null, getBackendBaseUrl: () => string) {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  return useQueryWithParse({
    queryKey: artistQueryKeys.genreCounts(getBackendBaseUrl(), artistUuid),
    // A missing artist is shown in the artist panel, not raised as an app-wide connectivity error.
    queryFn: () => fetch(artistEndpoints.genreCounts(artistUuid as string), true, false, undefined, undefined, false, true),
    schema: z.array(ArtistGenreCountSchema),
    enabled: artistUuid !== null,
    retry: (failureCount, error) => !isNotFound(error) && failureCount < 3,
    context: "useArtistGenreCounts",
  });
}
