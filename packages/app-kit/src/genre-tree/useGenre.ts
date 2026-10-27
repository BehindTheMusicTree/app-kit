import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { CriteriaOverviewSchema, CriteriaOverview } from "./schemas/criteria/overview";
import { CriteriaSimpleSchema } from "./schemas/criteria/simple";
import { CriteriaCreationSchema } from "./schemas/criteria/creation";
import { CriteriaUpdateSchema } from "./schemas/criteria/update";
import { GenreUuidSchema, type GenreUuid } from "./schemas/ids";
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
    async (id: GenreUuid): Promise<CriteriaDetailed> => {
      const endpoint = scope === "reference" ? genreEndpoints.reference.detail(id) : genreEndpoints.me.detail(id);
      const response = await fetch(endpoint, true, scope === "me");
      return parseWithLog(CriteriaDetailedSchema, response, "useFetchGenre");
    },
    [fetch, scope],
  );
}

export function useFetchGenreDetail<D extends CriteriaDetailed = CriteriaDetailed>(
  id: GenreUuid | null,
  scope: Scope,
  getBackendBaseUrl: () => string,
  // The default only applies when D is left at its CriteriaDetailed default.
  schema: z.ZodType<D, z.ZodTypeDef, unknown> = CriteriaDetailedSchema as unknown as z.ZodType<D, z.ZodTypeDef, unknown>,
) {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const queryKeys = scope === "reference" ? genreQueryKeys.reference : genreQueryKeys.me;
  const endpoints = scope === "reference" ? genreEndpoints.reference : genreEndpoints.me;

  return useQueryWithParse({
    queryKey: queryKeys.detail(id as GenreUuid),
    queryFn: () => fetch(endpoints.detail(id as GenreUuid), true, scope === "me"),
    schema,
    context: "useFetchGenreDetail",
    enabled: id !== null,
  });
}

const GENRE_OVERVIEW_STALE_TIME_MS = 60_000;

function useGenreOverviewQueryOptions<O extends CriteriaOverview>(
  scope: Scope,
  getBackendBaseUrl: () => string,
  schema: z.ZodType<O, z.ZodTypeDef, unknown>,
) {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);

  return useCallback(
    (id: GenreUuid) => {
      const queryKeys = scope === "reference" ? genreQueryKeys.reference : genreQueryKeys.me;
      const endpoints = scope === "reference" ? genreEndpoints.reference : genreEndpoints.me;
      return {
        queryKey: queryKeys.overview(id),
        queryFn: async () =>
          parseWithLog(schema, await fetch(endpoints.overview(id), true, scope === "me"), "useFetchGenreOverview"),
        staleTime: GENRE_OVERVIEW_STALE_TIME_MS,
      };
    },
    [fetch, scope, schema],
  );
}

export function useFetchGenreOverview<O extends CriteriaOverview = CriteriaOverview>(
  id: GenreUuid | null,
  scope: Scope,
  getBackendBaseUrl: () => string,
  // The default only applies when O is left at its CriteriaOverview default.
  schema: z.ZodType<O, z.ZodTypeDef, unknown> = CriteriaOverviewSchema as unknown as z.ZodType<O, z.ZodTypeDef, unknown>,
) {
  const queryOptions = useGenreOverviewQueryOptions(scope, getBackendBaseUrl, schema);
  return useQuery({ ...queryOptions(id as GenreUuid), enabled: id !== null });
}

export function usePrefetchGenreOverview<O extends CriteriaOverview = CriteriaOverview>(
  scope: Scope,
  getBackendBaseUrl: () => string,
  schema: z.ZodType<O, z.ZodTypeDef, unknown> = CriteriaOverviewSchema as unknown as z.ZodType<O, z.ZodTypeDef, unknown>,
) {
  const queryClient = useQueryClient();
  const queryOptions = useGenreOverviewQueryOptions(scope, getBackendBaseUrl, schema);
  return useCallback((id: GenreUuid) => queryClient.prefetchQuery(queryOptions(id)), [queryClient, queryOptions]);
}

function useRefreshGenreTree(scope: Scope) {
  const queryClient = useQueryClient();
  const invalidateAllGenrePlaylistQueries = useInvalidateAllGenrePlaylistQueries();

  // Returned so the mutation stays pending until the tree has refetched.
  return ({ changedUuid, deletedUuid }: { changedUuid?: GenreUuid; deletedUuid?: GenreUuid } = {}) => {
    const queryKeys = scope === "reference" ? genreQueryKeys.reference : genreQueryKeys.me;
    if (deletedUuid) {
      // Evicted rather than invalidated: refetching a deleted genre 404s and would hold the delete pending.
      queryClient.removeQueries({ queryKey: queryKeys.detail(deletedUuid) });
      queryClient.removeQueries({ queryKey: queryKeys.overview(deletedUuid) });
    }
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.all }),
      ...(changedUuid ? [queryClient.invalidateQueries({ queryKey: queryKeys.detail(changedUuid) })] : []),
      invalidateAllGenrePlaylistQueries(),
    ]);
  };
}

export function useCreateGenre(scope: Scope, getBackendBaseUrl: () => string) {
  const refreshGenreTree = useRefreshGenreTree(scope);
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
    onSuccess: () => refreshGenreTree(),
  });
}

export function useUpdateGenre(scope: Scope, getBackendBaseUrl: () => string) {
  const refreshGenreTree = useRefreshGenreTree(scope);
  const { fetch } = useFetchWrapper(getBackendBaseUrl);

  const { mutate, mutateAsync, isPending, formErrors } = useValidatedMutation({
    inputSchema: z.object({
      uuid: GenreUuidSchema,
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
    onSuccess: (_, { uuid }) => refreshGenreTree({ changedUuid: uuid }),
  });

  const renameGenre = (uuid: GenreUuid, name: string) => {
    mutate({ uuid, data: { name } });
  };

  const updateGenreParent = async (uuid: GenreUuid, parentUuid: GenreUuid | null) => {
    await mutateAsync({ uuid, data: { parent: parentUuid } });
  };

  return { mutate, renameGenre, updateGenreParent, isPending, formErrors };
}

export function useDeleteGenre(scope: Scope, getBackendBaseUrl: () => string) {
  const refreshGenreTree = useRefreshGenreTree(scope);
  const { fetch } = useFetchWrapper(getBackendBaseUrl);

  return useValidatedMutation({
    inputSchema: z.object({ uuid: GenreUuidSchema }),
    outputSchema: z.null(),
    mutationFn: async ({ uuid }) => {
      const endpoint = scope === "reference" ? genreEndpoints.reference.delete(uuid) : genreEndpoints.me.delete(uuid);
      // Global error handling makes the wrapper return null too, indistinguishable from a 204.
      return fetch(endpoint, true, scope === "me", { method: "DELETE" }, undefined, false, true);
    },
    onSuccess: (_, { uuid }) => refreshGenreTree({ deletedUuid: uuid }),
  });
}
