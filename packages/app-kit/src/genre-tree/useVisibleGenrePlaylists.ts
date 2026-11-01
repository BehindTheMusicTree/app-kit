"use client";

import { useMemo } from "react";
import { Scope } from "../transport/lib/scope";
import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";
import { useArtistGenreCounts } from "./useArtistGenreCounts";
import { useListFullGenrePlaylists } from "./useGenrePlaylist";
import { pruneGenrePlaylistsForArtist } from "./lib/prune-genre-playlists-for-artist";

export interface UseVisibleGenrePlaylistsOptions {
  scope: Scope;
  getBackendBaseUrl: () => string;
  /** When set, the tree is pruned to this artist's footprint and carries the artist's counts. */
  artistUuid?: string | null;
}

/**
 * The tree the user can navigate: the whole canonical tree, or the artist's footprint when
 * `artistUuid` is set. Hosts validate URL state (selected genre, focus) against this list. While the
 * artist's counts load the current tree stays (full, or the previous artist's footprint) and
 * `isFetching` is true; `isLoading` is true only until the first tree arrives. If the counts fail
 * (unknown artist, backend error) the whole tree is served, the artist panel being where that failure
 * is shown.
 */
export function useVisibleGenrePlaylists({ scope, getBackendBaseUrl, artistUuid = null }: UseVisibleGenrePlaylistsOptions) {
  const { data: tree, isPending: isTreePending, isFetching: isTreeFetching } = useListFullGenrePlaylists(scope, getBackendBaseUrl);
  const counts = useArtistGenreCounts(artistUuid, getBackendBaseUrl);
  const artistCounts = artistUuid !== null ? counts.data : undefined;
  const isCountsLoading = artistUuid !== null && (counts.isPending || counts.isPlaceholderData);

  const genrePlaylists = useMemo<CriteriaPlaylistSimple[]>(() => {
    if (!tree) return [];
    return artistCounts ? pruneGenrePlaylistsForArtist(tree, artistCounts) : tree;
  }, [tree, artistCounts]);

  return { isLoading: isTreePending, isFetching: isCountsLoading || (!isTreePending && isTreeFetching), genrePlaylists };
}
