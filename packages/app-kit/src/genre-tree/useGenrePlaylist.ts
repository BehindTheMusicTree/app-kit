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

type RawPaginatedResponse = {
  overallTotal: number;
  next: string | null;
  previous: string | null;
  results: unknown[];
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Backends may clamp `pageSize` below what's requested (e.g. a server-side max page size), so a
 * single request can silently return fewer results than `overallTotal`. Reads `totalPages` from the
 * first page, then fetches the rest in parallel so load time doesn't scale with the page count.
 */
// ponytail: unbounded Promise.all; browsers cap per-host connections, add a limiter if pages reach the hundreds.
const fetchAllPages = async (fetchPage: (page: number) => Promise<unknown>): Promise<RawPaginatedResponse> => {
  const first = (await fetchPage(1)) as RawPaginatedResponse;
  const rest = (await Promise.all(
    Array.from({ length: Math.max(first.totalPages - 1, 0) }, (_, i) => fetchPage(i + 2)),
  )) as RawPaginatedResponse[];
  const results = [first, ...rest].flatMap((response) => response.results);
  const last = rest[rest.length - 1] ?? first;

  return { ...last, results, page: 1, pageSize: results.length, totalPages: 1 };
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
      fetchAllPages((page) =>
        fetch(
          scope === "reference" ? genrePlaylistEndpoints.reference.list() : genrePlaylistEndpoints.me.list(),
          true,
          scope === "me",
          {},
          { page, pageSize: FULL_LIST_PAGE_SIZE, treeName: "canonical" },
        ),
      ),
    schema: PaginatedResponseSchema(CriteriaPlaylistSimpleSchema),
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
