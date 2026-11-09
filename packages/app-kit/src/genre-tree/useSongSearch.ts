"use client";

import { usePlaybackContext } from "../transport/PlaybackContext";
import { usePlaybackFetch } from "../transport/usePlaybackFetch";
import { SongSearchResultsSchema, type SongSearchParams, type SongSearchResult } from "./schemas/song-search";
import { libraryEndpoints, libraryQueryKeys } from "./api/library";
import { useRemoteSearch } from "./useRemoteSearch";

const DEFAULT_RESULT_LIMIT = 8;

export interface UseSongSearchResult {
  songs: SongSearchResult[];
  isError: boolean;
  /** True once the debounced query has caught up with the typed one and its fetch has finished. */
  settled: boolean;
  /** True from the first typed character past the minimum until results arrive or the search fails; covers the debounce. */
  pending: boolean;
}

export function useSongSearch(
  getBackendBaseUrl: () => string,
  text: string,
  options: Omit<SongSearchParams, "q"> = {},
): UseSongSearchResult {
  const playback = usePlaybackContext();
  const { fetchBound } = usePlaybackFetch(getBackendBaseUrl);
  const { limit = DEFAULT_RESULT_LIMIT, genre, playable } = options;
  const params = (q: string) => ({ q, limit, ...(genre && { genre }), ...(playable !== undefined && { playable }) });

  const { results, isError, settled, pending } = useRemoteSearch(getBackendBaseUrl, {
    queryKey: (q) => [...libraryQueryKeys.reference.songs.search(params(q)), ...(playback.key ? [playback.key] : [])],
    fetch: fetchBound,
    endpoint: libraryEndpoints.reference.songs.search(),
    params,
    schema: SongSearchResultsSchema,
    context: "useSongSearch",
    text,
    enabled: playback.ready,
    scope: playback.key ?? "",
  });
  return { songs: results, isError, settled, pending };
}
