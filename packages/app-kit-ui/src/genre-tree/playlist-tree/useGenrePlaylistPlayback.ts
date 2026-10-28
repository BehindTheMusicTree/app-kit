"use client";

import { useCallback, useMemo } from "react";
import {
  TrackListOriginType,
  useTrackList,
  type CriteriaPlaylistSimple,
  type TrackBase,
  type TrackListOriginFromArtist,
} from "@behindthemusictree/app-kit/genre-tree";
import type { Scope } from "@behindthemusictree/app-kit/transport";

/** What a tree node's play button plays, and which node is the one currently playing. */
export type GenrePlaylistPlayback = {
  playingNodeId: string | null;
  play: (genrePlaylist: CriteriaPlaylistSimple) => Promise<void>;
};

export type UseGenrePlaylistPlaybackOptions = {
  scope: Scope;
  genrePlaylists: CriteriaPlaylistSimple[];
  /** When set, nodes play only this artist's songs in the genre's subtree instead of the whole genre playlist. */
  artist?: { uuid: string; name: string } | null;
};

export function useGenrePlaylistPlayback<T extends TrackBase = TrackBase>({
  scope,
  genrePlaylists,
  artist = null,
}: UseGenrePlaylistPlaybackOptions): GenrePlaylistPlayback {
  const { trackList, playNewTrackListFromGenrePlaylist, playNewTrackListFromArtist } = useTrackList<T>();
  const origin = trackList?.origin;

  const playingNodeId = useMemo(() => {
    if (!origin) return null;
    if (!artist) return origin.type === TrackListOriginType.GENRE_PLAYLIST ? origin.uuid : null;
    if (origin.type !== TrackListOriginType.ARTIST || origin.uuid !== artist.uuid) return null;
    const { genreUuid } = origin as TrackListOriginFromArtist;
    return genreUuid ? (genrePlaylists.find((gp) => gp.criteria?.uuid === genreUuid)?.uuid ?? null) : null;
  }, [origin, artist, genrePlaylists]);

  const play = useCallback(
    async (genrePlaylist: CriteriaPlaylistSimple) => {
      if (!artist) return playNewTrackListFromGenrePlaylist(genrePlaylist, scope);
      // Genre-less songs have no genre to filter on.
      if (!genrePlaylist.criteria) return;
      return playNewTrackListFromArtist(artist, scope, { ordering: "title", genreUuid: genrePlaylist.criteria.uuid });
    },
    [artist, scope, playNewTrackListFromGenrePlaylist, playNewTrackListFromArtist],
  );

  return useMemo(() => ({ playingNodeId, play }), [playingNodeId, play]);
}
