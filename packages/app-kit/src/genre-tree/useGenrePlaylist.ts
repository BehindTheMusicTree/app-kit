"use client";

import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { useSession } from "../auth/SessionContext";

import { CriteriaPlaylistSimpleSchema } from "./schemas/criteria-playlist/simple";

import { PaginatedResponseSchema } from "../transport/lib/paginated-response";
import { genrePlaylistEndpoints, genrePlaylistQueryKeys } from "./api/genre-playlists";
import { Scope } from "../transport/lib/scope";

// grow-api clamps pageSize to PAGINATION_PAGE_SIZE_MAX (100); asking for more only hides the real page count.
const FULL_LIST_PAGE_SIZE = 100;
// An unbounded fan-out (17 parallel pages through grow-front's proxy) OOM-killed its 96m container.
const FULL_LIST_CONCURRENCY = 4;

type RawPaginatedResponse = {
  results: unknown[];
  totalPages: number;
};

/**
 * Backends may clamp `pageSize` below what's requested (e.g. a server-side max page size), so a
 * single request can silently return fewer results than `overallTotal`. Reads `totalPages` from the
 * first page, then fetches the rest with at most FULL_LIST_CONCURRENCY requests in flight.
 */
const fetchAllPages = async (fetchPage: (page: number) => Promise<unknown>): Promise<unknown[]> => {
  // fetch-wrapper resolves null (instead of throwing) when a handleError callback swallowed the failure.
  const fetchRequiredPage = async (page: number) => {
    const response = await fetchPage(page);
    if (response == null) throw new Error(`Paginated list page ${page} returned no body`);
    return response as RawPaginatedResponse;
  };
  const first = await fetchRequiredPage(1);
  const remaining = Math.max(first.totalPages - 1, 0);
  const rest: RawPaginatedResponse[] = new Array(remaining);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(FULL_LIST_CONCURRENCY, remaining) }, async () => {
      while (nextIndex < remaining) {
        const index = nextIndex++;
        rest[index] = await fetchRequiredPage(index + 2);
      }
    }),
  );
  return [first, ...rest].flatMap((response) => response.results);
};

export const useListGenrePlaylists = (page = 1, pageSize: number | string = 50, getBackendBaseUrl: () => string) => {
  const queryClient = useQueryClient();
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const { session, sessionRestored } = useSession();

  const query = useQueryWithParse({
    queryKey: genrePlaylistQueryKeys.me.list(page),
    queryFn: () => fetch(genrePlaylistEndpoints.me.list(), true, true, {}, { page, pageSize }),
    schema: PaginatedResponseSchema(CriteriaPlaylistSimpleSchema),
    context: "useListGenrePlaylists",
    enabled: sessionRestored && !!session?.accessToken,
  });

  const invalidateGenrePlaylists = () => {
    queryClient.invalidateQueries({ queryKey: genrePlaylistQueryKeys.me.all });
  };

  return {
    ...query,
    invalidateGenrePlaylists,
  };
};

export const useListFullGenrePlaylists = (scope: Scope, getBackendBaseUrl: () => string) => {
  const queryClient = useQueryClient();
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const { session, sessionRestored } = useSession();
  const queryKey =
    scope === "reference" ? genrePlaylistQueryKeys.reference.full(getBackendBaseUrl()) : genrePlaylistQueryKeys.me.full;

  const query = useQueryWithParse({
    queryKey,
    queryFn: () =>
      scope === "reference"
        ? fetch(genrePlaylistEndpoints.reference.tree(), true, false, {}, { treeName: "canonical" })
        : fetchAllPages((page) =>
            fetch(
              genrePlaylistEndpoints.me.list(),
              true,
              true,
              {},
              { page, pageSize: FULL_LIST_PAGE_SIZE, treeName: "canonical" },
            ),
          ),
    schema: z.array(CriteriaPlaylistSimpleSchema),
    context: "useListFullGenrePlaylists",
    enabled: scope === "reference" || (sessionRestored && !!session?.accessToken),
  });

  const invalidateFullGenrePlaylists = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    ...query,
    invalidateFullGenrePlaylists,
  };
};

export const useFetchGenrePlaylist = <S extends z.ZodTypeAny>(
  uuid: string,
  getBackendBaseUrl: () => string,
  criteriaPlaylistDetailedSchema: S,
) => {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const { session, sessionRestored } = useSession();
  return useQueryWithParse<z.infer<S>>({
    queryKey: genrePlaylistQueryKeys.me.detail(uuid),
    queryFn: () => fetch(genrePlaylistEndpoints.me.detail(uuid)),
    schema: criteriaPlaylistDetailedSchema,
    context: "useFetchGenrePlaylist",
    enabled: !!uuid && sessionRestored && !!session?.accessToken,
  });
};

export const useInvalidateAllGenrePlaylistQueries = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: genrePlaylistQueryKeys.me.all });
    queryClient.invalidateQueries({ queryKey: genrePlaylistQueryKeys.me.full });
    queryClient.invalidateQueries({ queryKey: genrePlaylistQueryKeys.reference.all });
  };
};
