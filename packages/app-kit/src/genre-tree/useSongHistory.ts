"use client";

import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { SongHistorySchema, type SongHistoryEntry } from "./schemas/song-history";
import { libraryEndpoints, libraryQueryKeys } from "./api/library";

export type UseSongHistoryResult =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; entries: SongHistoryEntry[] };

/** Lazy: nothing is fetched until `enabled`, e.g. while the panel's History section is open. */
export function useSongHistory(uuid: string | null, getBackendBaseUrl: () => string, enabled: boolean): UseSongHistoryResult {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const active = enabled && uuid !== null;
  const { data, isPending, error } = useQueryWithParse({
    queryKey: libraryQueryKeys.reference.songs.history(uuid),
    queryFn: ({ signal }) =>
      fetch(libraryEndpoints.reference.songs.history(uuid as string), true, false, { signal }, undefined, false, true),
    schema: SongHistorySchema,
    enabled: active,
    context: "useSongHistory",
  });

  if (!active) return { status: "idle" };
  if (error) return { status: "error" };
  if (isPending) return { status: "loading" };
  return { status: "success", entries: data };
}
