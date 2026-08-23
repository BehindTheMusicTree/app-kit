"use client";

import { z } from "zod";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useFetchWrapper } from "../transport/useFetchWrapper";
import { parseWithLog } from "../transport/lib/parse-with-log";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { useSession } from "../auth/SessionContext";

import { CriteriaPlaylistSimpleSchema } from "./schemas/criteria-playlist/simple";

import { PaginatedResponseSchema } from "../transport/lib/paginated-response";
import { genrePlaylistEndpoints, genrePlaylistQueryKeys } from "./api/genre-playlists";
import { Scope } from "../transport/lib/scope";

const FULL_LIST_PAGE_SIZE = 1000;

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
  const queryKey = scope === "reference" ? genrePlaylistQueryKeys.reference.full : genrePlaylistQueryKeys.me.full;

  const query = useQueryWithParse({
    queryKey,
    queryFn: () =>
      fetch(
        scope === "reference" ? genrePlaylistEndpoints.reference.list() : genrePlaylistEndpoints.me.list(),
        true,
        scope === "me",
        {},
        { page: 1, pageSize: FULL_LIST_PAGE_SIZE },
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

export const useFetchGenrePlaylistDetailed = <S extends z.ZodTypeAny>(
  scope: Scope,
  getBackendBaseUrl: () => string,
  criteriaPlaylistDetailedSchema: S,
) => {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);

  return useMutation<z.infer<S>, Error, string>({
    mutationFn: async (uuid: string) => {
      const endpoint =
        scope === "reference" ? genrePlaylistEndpoints.reference.detail(uuid) : genrePlaylistEndpoints.me.detail(uuid);
      const response = await fetch(endpoint, true, scope === "me");
      return parseWithLog(
        criteriaPlaylistDetailedSchema,
        response,
        "useFetchGenrePlaylistDetailed",
      ) as z.infer<S>;
    },
  });
};

export const useInvalidateAllGenrePlaylistQueries = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: genrePlaylistQueryKeys.me.all });
    queryClient.invalidateQueries({ queryKey: genrePlaylistQueryKeys.me.full });
    queryClient.invalidateQueries({ queryKey: genrePlaylistQueryKeys.reference.all });
    queryClient.invalidateQueries({ queryKey: genrePlaylistQueryKeys.reference.full });
  };
};
