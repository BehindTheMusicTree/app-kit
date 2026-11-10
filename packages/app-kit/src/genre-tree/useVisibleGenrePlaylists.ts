"use client";

import { useMemo } from "react";
import { Scope } from "../transport/lib/scope";
import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";
import { useArtistGenreCounts } from "./useArtistGenreCounts";
import { useListFullGenrePlaylists } from "./useGenrePlaylist";
import { projectGenrePlaylistsForArtist } from "./lib/project-genre-playlists-for-artist";

export interface UseVisibleGenrePlaylistsOptions {
  scope: Scope;
  getBackendBaseUrl: () => string;
  /** When set, the tree carries this artist's counts and `focusUuids` marks their footprint. */
  artistUuid?: string | null;
}

/**
 * The tree the user can navigate: always the whole canonical tree. When `artistUuid` is set it
 * carries the artist's counts and `focusUuids` names their footprint (undefined otherwise); genres
 * outside it stay navigable and renderers draw them muted. While the artist's counts load the
 * current tree stays (with the previous artist's projection) and `isFetching` is true; `isLoading`
 * is true only until the first tree arrives. If the counts fail (unknown artist, backend error) the
 * plain tree is served, the artist panel being where that failure is shown.
 */
export function useVisibleGenrePlaylists({ scope, getBackendBaseUrl, artistUuid = null }: UseVisibleGenrePlaylistsOptions) {
  const { data: tree, isPending: isTreePending, isFetching: isTreeFetching, isError: isTreeError, refetch } = useListFullGenrePlaylists(scope, getBackendBaseUrl);
  const counts = useArtistGenreCounts(artistUuid, getBackendBaseUrl);
  const artistCounts = artistUuid !== null ? counts.data : undefined;
  const isCountsLoading = artistUuid !== null && (counts.isPending || counts.isPlaceholderData);

  const projection = useMemo<{ genrePlaylists: CriteriaPlaylistSimple[]; focusUuids: ReadonlySet<string> | undefined }>(() => {
    if (!tree) return { genrePlaylists: [], focusUuids: undefined };
    return artistCounts ? projectGenrePlaylistsForArtist(tree, artistCounts) : { genrePlaylists: tree, focusUuids: undefined };
  }, [tree, artistCounts]);

  return {
    isLoading: isTreePending,
    // The tree failed with nothing cached to show; the host must say so rather than render an empty tree.
    isError: isTreeError && !tree,
    refetch,
    isFetching: isCountsLoading || (!isTreePending && isTreeFetching),
    genrePlaylists: projection.genrePlaylists,
    focusUuids: projection.focusUuids,
  };
}
