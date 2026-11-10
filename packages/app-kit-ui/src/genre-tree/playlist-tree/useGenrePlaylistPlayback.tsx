"use client";

import { useCallback, useMemo } from "react";
import {
  TrackListOriginType, TracksFailureAlreadyReportedError, useTrackList, GenreCatalogueCountsSchema,
  defaultGenreMusicSelection, genreMusicSelectionKey,
  type GenreMusicSelection,
  type CriteriaPlaylistMinimum, type CriteriaPlaylistSimple, type TrackBase,
  type TrackListOriginFromCriteriaPlaylist,
} from "@behindthemusictree/app-kit/genre-tree";
import { usePopup } from "@behindthemusictree/app-kit/popup";
import { AppError, ErrorCode, type Scope } from "@behindthemusictree/app-kit/transport";
import InternalErrorPopup from "../../popup/InternalErrorPopup";

export type PlayableGenrePlaylistInput = CriteriaPlaylistMinimum & { criteria?: CriteriaPlaylistSimple["criteria"] };
/** The playlist loaded in the player; `selectionKey` is `genreMusicSelectionKey(selection).join()`, empty without a selection. */
export type PlayingGenrePlaylist = { uuid: string; selectionKey: string };
export type GenrePlaylistPlayback = {
  playing: PlayingGenrePlaylist | null;
  /**
   * Plays `genrePlaylist`; `selection` overrides the default coverage of a reference genre. Never rejects: connectivity
   * errors reach the global popup through the backend request layer, any other failure is shown here with its real code.
   */
  play: (genrePlaylist: PlayableGenrePlaylistInput, selection?: GenreMusicSelection) => Promise<void>;
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
  const { showPopup } = usePopup();
  const origin = trackList?.origin;
  const playing = useMemo<PlayingGenrePlaylist | null>(() => {
    if (!origin || origin.type !== TrackListOriginType.GENRE_PLAYLIST || origin.scope !== scope) return null;
    const playlistOrigin = origin as TrackListOriginFromCriteriaPlaylist;
    if (playlistOrigin.artistUuid !== artist?.uuid) return null;
    const playlist = genrePlaylists.find((item) => item.uuid === origin.uuid) ?? playlistOrigin.criteriaPlaylist;
    const expected = scope === "reference" && playlist && !("criteria" in playlist && playlist.criteria === null)
      ? defaultGenreMusicSelection(GenreCatalogueCountsSchema.parse(playlist)) : undefined;
    return { uuid: origin.uuid, selectionKey: genreMusicSelectionKey(playlistOrigin.selection ?? expected).join() };
  }, [origin, artist, genrePlaylists, scope]);

  const play = useCallback(async (playlist: PlayableGenrePlaylistInput, requested?: GenreMusicSelection) => {
    if (artist && !playlist.criteria) return;
    try {
      const selection = scope === "reference" && playlist.criteria !== null
        ? requested ?? defaultGenreMusicSelection(GenreCatalogueCountsSchema.parse(playlist)) : undefined;
      await (selection || artist
        ? playNewTrackListFromGenrePlaylist(playlist, scope, { selection, ...(artist && { artistUuid: artist.uuid }) })
        : playNewTrackListFromGenrePlaylist(playlist, scope));
    } catch (error) {
      console.error("Failed to load genre playlist tracks:", error);
      if (error instanceof TracksFailureAlreadyReportedError) return;
      showPopup(<InternalErrorPopup errorCode={error instanceof AppError ? error.code : ErrorCode.CLIENT_UNKNOWN} />);
    }
  }, [artist, scope, playNewTrackListFromGenrePlaylist, showPopup]);

  return useMemo(() => ({ playing, play }), [playing, play]);
}
