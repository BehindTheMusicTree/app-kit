import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useSession } from "../auth/SessionContext";
import { useInvalidateAllGenrePlaylistQueries } from "./useGenrePlaylist";
import { parseWithLog } from "../transport/lib/parse-with-log";
import { PaginatedResponseSchema } from "../transport/lib/paginated-response";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { useValidatedMutation } from "../transport/lib/use-validated-mutation";
import { Scope } from "../transport/lib/scope";
import { CriteriaDetailedSchema, CriteriaDetailed } from "./schemas/criteria/detailed";
import { CriteriaSimpleSchema } from "./schemas/criteria/simple";
import { CriteriaCreationSchema } from "./schemas/criteria/creation";
import { CriteriaUpdateSchema } from "./schemas/criteria/update";
import { genreEndpoints, genreQueryKeys } from "./api/genres";

export function useListGenres(
  page = 1,
  pageSize: number | string = 50,
  scope: Scope,
  getBackendBaseUrl: () => string,
) {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const { session, sessionRestored } = useSession();
  const endpoint = scope === "reference" ? genreEndpoints.reference.list() : genreEndpoints.me.list();

  return useQueryWithParse({
    queryKey: scope === "reference" ? genreQueryKeys.reference.list(page) : genreQueryKeys.me.list(page),
    queryFn: () => fetch(endpoint, true, scope === "me", {}, { page, pageSize }),
    schema: PaginatedResponseSchema(CriteriaSimpleSchema),
    context: "useListGenres",
    enabled: scope === "reference" || (sessionRestored && !!session?.accessToken),
  });
}

export function useFetchGenre(scope: Scope, getBackendBaseUrl: () => string) {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);

  return useCallback(
    async (id: string): Promise<CriteriaDetailed> => {
      const endpoint = scope === "reference" ? genreEndpoints.reference.detail(id) : genreEndpoints.me.detail(id);
      const response = await fetch(endpoint, true, scope === "me");
      return parseWithLog(CriteriaDetailedSchema, response, "useFetchGenre");
    },
    [fetch, scope],
  );
}

export function useLoadExampleTreeGenre(scope: Scope, getBackendBaseUrl: () => string) {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const queryClient = useQueryClient();
  const invalidateAllGenrePlaylistQueries = useInvalidateAllGenrePlaylistQueries();

  return useValidatedMutation({
    inputSchema: z.void(),
    outputSchema: CriteriaDetailedSchema,
    mutationFn: async () => {
      const endpoint =
        scope === "reference" ? genreEndpoints.reference.loadExampleTree() : genreEndpoints.me.loadExampleTree();
      const response = await fetch(endpoint, true, scope === "me", {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      const queryKey = scope === "reference" ? genreQueryKeys.reference.all : genreQueryKeys.me.all;
      queryClient.invalidateQueries({ queryKey });
      invalidateAllGenrePlaylistQueries();
    },
  });
}

export function useCreateGenre(scope: Scope, getBackendBaseUrl: () => string) {
  const queryClient = useQueryClient();
  const invalidateAllGenrePlaylistQueries = useInvalidateAllGenrePlaylistQueries();
  const { fetch } = useFetchWrapper(getBackendBaseUrl);

  return useValidatedMutation({
    inputSchema: CriteriaCreationSchema,
    outputSchema: CriteriaDetailedSchema,
    mutationFn: async (data) => {
      const endpoint = scope === "reference" ? genreEndpoints.reference.create() : genreEndpoints.me.create();
      const response = await fetch(endpoint, true, scope === "me", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      const queryKey = scope === "reference" ? genreQueryKeys.reference.all : genreQueryKeys.me.all;
      queryClient.invalidateQueries({ queryKey });
      invalidateAllGenrePlaylistQueries();
    },
  });
}

export function useUpdateGenre(scope: Scope, getBackendBaseUrl: () => string) {
  const queryClient = useQueryClient();
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const invalidateAllGenrePlaylistQueries = useInvalidateAllGenrePlaylistQueries();

  const { mutate, formErrors } = useValidatedMutation({
    inputSchema: z.object({
      uuid: z.string(),
      data: CriteriaUpdateSchema,
    }),
    outputSchema: CriteriaDetailedSchema,
    mutationFn: async ({ uuid, data }) => {
      const endpoint = scope === "reference" ? genreEndpoints.reference.update(uuid) : genreEndpoints.me.update(uuid);
      const response = await fetch(endpoint, true, scope === "me", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (_, { uuid }) => {
      const queryKey = scope === "reference" ? genreQueryKeys.reference.all : genreQueryKeys.me.all;
      const detailKey = scope === "reference" ? genreQueryKeys.reference.detail(uuid) : genreQueryKeys.me.detail(uuid);
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: detailKey });
      invalidateAllGenrePlaylistQueries();
    },
  });

  const renameGenre = (uuid: string, name: string) => {
    mutate({ uuid, data: { name } });
  };

  const updateGenreParent = async (uuid: string, parentUuid: string) => {
    return new Promise<void>((resolve) => {
      mutate({ uuid, data: { parent: parentUuid } });
      resolve();
    });
  };

  return { mutate, renameGenre, updateGenreParent, formErrors };
}

export function useDeleteGenre(scope: Scope, getBackendBaseUrl: () => string) {
  const queryClient = useQueryClient();
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const invalidateAllGenrePlaylistQueries = useInvalidateAllGenrePlaylistQueries();

  return useValidatedMutation({
    inputSchema: z.object({ uuid: z.string() }),
    outputSchema: CriteriaDetailedSchema,
    mutationFn: async ({ uuid }) => {
      const endpoint = scope === "reference" ? genreEndpoints.reference.delete(uuid) : genreEndpoints.me.delete(uuid);
      const response = await fetch(endpoint, true, scope === "me", {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: (_, { uuid }) => {
      const queryKey = scope === "reference" ? genreQueryKeys.reference.all : genreQueryKeys.me.all;
      const detailKey = scope === "reference" ? genreQueryKeys.reference.detail(uuid) : genreQueryKeys.me.detail(uuid);
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: detailKey });
      invalidateAllGenrePlaylistQueries();
    },
  });
}
