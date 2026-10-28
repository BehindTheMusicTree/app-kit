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
 * artist's counts load it is empty and `isLoading` is true; if they fail (unknown artist, backend
 * error) the whole tree is served, the artist panel being where that failure is shown.
 */
export function useVisibleGenrePlaylists({ scope, getBackendBaseUrl, artistUuid = null }: UseVisibleGenrePlaylistsOptions) {
  const { data: tree, isPending: isTreePending } = useListFullGenrePlaylists(scope, getBackendBaseUrl);
  const counts = useArtistGenreCounts(artistUuid, getBackendBaseUrl);
  const isCountsPending = artistUuid !== null && counts.isPending;

  const genrePlaylists = useMemo<CriteriaPlaylistSimple[]>(() => {
    if (!tree || isCountsPending) return [];
    return counts.data ? pruneGenrePlaylistsForArtist(tree, counts.data) : tree;
  }, [tree, isCountsPending, counts.data]);

  return { isLoading: isTreePending || isCountsPending, genrePlaylists };
}
