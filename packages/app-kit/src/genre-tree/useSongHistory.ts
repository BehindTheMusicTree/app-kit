"use client";

import { usePlaybackQuery } from "../transport/lib/use-playback-query";
import { SongHistorySchema, type SongHistoryEntry } from "./schemas/song-history";
import { toSongUuid } from "./schemas/ids";
import { libraryEndpoints, libraryQueryKeys } from "./api/library";

export type UseSongHistoryResult =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; entries: SongHistoryEntry[] };

/** Lazy: nothing is fetched until `enabled`, e.g. while the panel's History section is open. A null or malformed `uuid` stays idle. */
export function useSongHistory(uuid: string | null, getBackendBaseUrl: () => string, enabled: boolean): UseSongHistoryResult {
  const id = toSongUuid(uuid);
  const active = enabled && id !== null;
  const { data, isPending, error } = usePlaybackQuery({
    getBackendBaseUrl,
    queryKey: libraryQueryKeys.reference.songs.history(id),
    queryFn: (fetchBound, { signal }) =>
      fetchBound(libraryEndpoints.reference.songs.history(id as string), true, false, { signal }),
    schema: SongHistorySchema,
    enabled: active,
    context: "useSongHistory",
  });

  if (!active) return { status: "idle" };
  if (error) return { status: "error" };
  if (isPending) return { status: "loading" };
  return { status: "success", entries: data };
}
