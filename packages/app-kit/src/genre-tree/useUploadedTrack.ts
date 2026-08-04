import { z } from "zod";
import { useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useSession } from "../auth/SessionContext";
import { useInvalidateAllGenrePlaylistQueries } from "./useGenrePlaylist";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { UploadedTrackDetailedSchema } from "./schemas/uploaded-track/detailed";
import { UploadedTrackCreationSchema } from "./schemas/uploaded-track/form/creation";
import { UploadedTrackUpdateSchema } from "./schemas/uploaded-track/form/update";
import { PaginatedResponseSchema } from "../transport/lib/paginated-response";
import { useValidatedMutation } from "../transport/lib/use-validated-mutation";
import { libraryEndpoints, libraryQueryKeys } from "./api/library";
import { Scope } from "../transport/lib/scope";

export function useListUploadedTracks(
  scope: Scope | null,
  getBackendBaseUrl: () => string,
  page = 1,
  pageSize: number | string = 50,
) {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const { session, sessionRestored } = useSession();

  return useQueryWithParse({
    queryKey: scope != null ? libraryQueryKeys[scope].uploaded.list(page) : ["uploadedTracks", "none", page],
    queryFn: async () => {
      if (scope == null) return null;
      return fetch(libraryEndpoints[scope].uploaded.list(), true, scope === "me", {}, { page, pageSize });
    },
    schema: PaginatedResponseSchema(UploadedTrackDetailedSchema),
    context: "useListUploadedTracks",
    enabled: scope != null && (scope === "reference" || (sessionRestored && !!session?.accessToken)),
  });
}

export function useUploadTrack(scope: Scope | null, getBackendBaseUrl: () => string) {
  const queryClient = useQueryClient();
  const invalidateAllGenrePlaylistQueries = useInvalidateAllGenrePlaylistQueries();
  const { fetch } = useFetchWrapper(getBackendBaseUrl);

  return useValidatedMutation({
    inputSchema: UploadedTrackCreationSchema,
    outputSchema: UploadedTrackDetailedSchema,
    mutationFn: async (data) => {
      if (scope == null) throw new Error("Scope is required for uploading tracks");

      const formData = new FormData();
      formData.append("file", data.file);

      if (data.track_file_fingerprint_must_be_unique !== undefined) {
        formData.append("track_file_fingerprint_must_be_unique", String(data.track_file_fingerprint_must_be_unique));
      }
      if (data.title !== undefined && data.title !== null) {
        formData.append("title", data.title);
      }
      if (data.force_title_generation !== undefined) {
        formData.append("force_title_generation", String(data.force_title_generation));
      }
      if (data.artists_names !== undefined && data.artists_names !== null) {
        formData.append("artists_names", data.artists_names);
      }
      if (data.album_name !== undefined && data.album_name !== null) {
        formData.append("album_name", data.album_name);
      }
      if (data.album_artists_names !== undefined && data.album_artists_names !== null) {
        formData.append("album_artists_names", data.album_artists_names);
      }
      if (data.track_number !== undefined) {
        formData.append("track_number", String(data.track_number));
      }
      if (data.genre !== undefined && data.genre !== null) {
        formData.append("genre", data.genre);
      }
      if (data.rating !== undefined) {
        formData.append("rating", String(data.rating));
      }
      if (data.language !== undefined && data.language !== null) {
        formData.append("language", data.language);
      }

      const response = await fetch(libraryEndpoints[scope].uploaded.create(), true, scope === "me", {
        method: "POST",
        body: formData,
      });
      return response;
    },
    onSuccess: () => {
      if (scope != null) {
        queryClient.invalidateQueries({ queryKey: libraryQueryKeys[scope].uploaded.all });
      }
      invalidateAllGenrePlaylistQueries();
    },
  });
}

export function useUpdateUploadedTrack(scope: Scope | null, getBackendBaseUrl: () => string) {
  const queryClient = useQueryClient();
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const invalidateAllGenrePlaylistQueries = useInvalidateAllGenrePlaylistQueries();

  const mutation = useValidatedMutation({
    inputSchema: z.object({
      uuid: z.string(),
      data: UploadedTrackUpdateSchema,
    }),
    outputSchema: UploadedTrackDetailedSchema,
    mutationFn: async ({ uuid, data }) => {
      if (scope == null) throw new Error("Scope is required for updating tracks");

      const response = await fetch(libraryEndpoints[scope].uploaded.update(uuid), true, scope === "me", {
        method: "PUT",
        body: JSON.stringify(data),
      });

      // Handle case where API returns null
      if (response === null) {
        throw new Error("API returned null response");
      }

      return response;
    },
    onSuccess: (_, { uuid }) => {
      if (scope != null) {
        queryClient.invalidateQueries({ queryKey: libraryQueryKeys[scope].uploaded.all });
        queryClient.invalidateQueries({ queryKey: libraryQueryKeys[scope].uploaded.detail(uuid) });
      }
      invalidateAllGenrePlaylistQueries();
    },
  });
  return mutation;
}

export interface UseDownloadTrackOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export function useDownloadTrack(
  uuid: string,
  scope: Scope | null,
  getBackendBaseUrl: () => string,
  options?: UseDownloadTrackOptions,
) {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const { session, sessionRestored } = useSession();
  const { onSuccess, onError } = options ?? {};
  const lastDataRef = useRef<unknown>(undefined);
  const lastErrorRef = useRef<Error | null>(null);

  const result = useQuery({
    queryKey:
      scope != null ? libraryQueryKeys[scope].uploaded.download(uuid) : ["uploadedTrack", "download", "none", uuid],
    queryFn: async () => {
      if (scope == null) return null;
      const response = await fetch(libraryEndpoints[scope].uploaded.download(uuid), true, scope === "me", {}, {}, true);

      return response;
    },
    enabled: !!uuid && scope != null && (scope === "reference" || (sessionRestored && !!session?.accessToken)),
  });

  useEffect(() => {
    lastDataRef.current = undefined;
    lastErrorRef.current = null;
  }, [uuid, scope]);

  useEffect(() => {
    if (result.data !== undefined && result.data !== lastDataRef.current && !result.isLoading) {
      lastDataRef.current = result.data;
      onSuccess?.(result.data);
    }
  }, [result.data, result.isLoading, onSuccess]);

  useEffect(() => {
    if (result.error != null && result.error !== lastErrorRef.current) {
      lastErrorRef.current = result.error as Error;
      onError?.(result.error as Error);
    }
  }, [result.error, onError]);

  return result;
}
