"use client";

import { usePlaybackQuery } from "../transport/lib/use-playback-query";
import { SongHistorySchema, type SongHistoryEntry } from "./schemas/song-history";
import { libraryEndpoints, libraryQueryKeys } from "./api/library";

export type UseSongHistoryResult =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; entries: SongHistoryEntry[] };

/** Lazy: nothing is fetched until `enabled`, e.g. while the panel's History section is open. */
export function useSongHistory(uuid: string | null, getBackendBaseUrl: () => string, enabled: boolean): UseSongHistoryResult {
  const active = enabled && uuid !== null;
  const { data, isPending, error } = usePlaybackQuery({
    getBackendBaseUrl,
    queryKey: libraryQueryKeys.reference.songs.history(uuid),
    queryFn: (fetchBound, { signal }) =>
      fetchBound(libraryEndpoints.reference.songs.history(uuid as string), true, false, { signal }),
    schema: SongHistorySchema,
    enabled: active,
    context: "useSongHistory",
  });

  if (!active) return { status: "idle" };
  if (error) return { status: "error" };
  if (isPending) return { status: "loading" };
  return { status: "success", entries: data };
}
