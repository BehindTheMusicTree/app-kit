"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";

import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { resourceRetry } from "../transport/lib/resource-result";
import { ArtistGenreCountSchema } from "./schemas/artist-genre-count";
import { artistEndpoints, artistQueryKeys } from "./api/artists";

/** The artist's footprint on the canonical tree (sparse: non-zero genre playlists only). Idle while `artistUuid` is null. */
export function useArtistGenreCounts(artistUuid: string | null, getBackendBaseUrl: () => string) {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  return useQueryWithParse({
    queryKey: [...artistQueryKeys.genreCounts(getBackendBaseUrl(), artistUuid), "genreMusicV1"],
    queryFn: () => fetch(artistEndpoints.genreCounts(artistUuid as string), true, false),
    schema: z.array(ArtistGenreCountSchema),
    enabled: artistUuid !== null,
    placeholderData: keepPreviousData,
    retry: resourceRetry,
    context: "useArtistGenreCounts",
  });
}
