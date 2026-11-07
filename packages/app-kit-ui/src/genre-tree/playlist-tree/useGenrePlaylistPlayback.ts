"use client";

import { useCallback, useMemo } from "react";
import {
  TrackListOriginType, useTrackList, GenreCatalogueCountsSchema,
  defaultGenreMusicSelection, genreMusicSelectionKey,
  type CriteriaPlaylistMinimum, type CriteriaPlaylistSimple, type TrackBase,
  type TrackListOriginFromCriteriaPlaylist,
} from "@behindthemusictree/app-kit/genre-tree";
import type { Scope } from "@behindthemusictree/app-kit/transport";

export type PlayableGenrePlaylistInput = CriteriaPlaylistMinimum & { criteria?: CriteriaPlaylistSimple["criteria"] };
export type GenrePlaylistPlayback = {
  playingNodeId: string | null;
  play: (genrePlaylist: PlayableGenrePlaylistInput) => Promise<void>;
};
export type UseGenrePlaylistPlaybackOptions = {
  scope: Scope;
  genrePlaylists: CriteriaPlaylistSimple[];
  artist?: { uuid: string; name: string } | null;
};

export function useGenrePlaylistPlayback<T extends TrackBase = TrackBase>({
  scope, genrePlaylists, artist = null,
}: UseGenrePlaylistPlaybackOptions): GenrePlaylistPlayback {
  const { trackList, playNewTrackListFromGenrePlaylist } = useTrackList<T>();
  const origin = trackList?.origin;
  const playingNodeId = useMemo(() => {
    if (!origin || origin.type !== TrackListOriginType.GENRE_PLAYLIST || origin.scope !== scope) return null;
    const playlistOrigin = origin as TrackListOriginFromCriteriaPlaylist;
    if (playlistOrigin.artistUuid !== artist?.uuid) return null;
    const playlist = genrePlaylists.find((item) => item.uuid === origin.uuid) ?? playlistOrigin.criteriaPlaylist;
    const expected = scope === "reference" && playlist && !("criteria" in playlist && playlist.criteria === null)
      ? defaultGenreMusicSelection(GenreCatalogueCountsSchema.parse(playlist)) : undefined;
    if (playlistOrigin.selection && expected && genreMusicSelectionKey(playlistOrigin.selection).join() !== genreMusicSelectionKey(expected).join()) return null;
    return origin.uuid;
  }, [origin, artist, genrePlaylists, scope]);

  const play = useCallback(async (playlist: PlayableGenrePlaylistInput) => {
    if (artist && !playlist.criteria) return;
    const selection = scope === "reference" && playlist.criteria !== null
      ? defaultGenreMusicSelection(GenreCatalogueCountsSchema.parse(playlist)) : undefined;
    return selection || artist
      ? playNewTrackListFromGenrePlaylist(playlist, scope, { selection, ...(artist && { artistUuid: artist.uuid }) })
      : playNewTrackListFromGenrePlaylist(playlist, scope);
  }, [artist, scope, playNewTrackListFromGenrePlaylist]);

  return useMemo(() => ({ playingNodeId, play }), [playingNodeId, play]);
}
