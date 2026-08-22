"use client";

/**
 * Adapted from grow-the-music-tree-frontend's original `TrackListContext.tsx`: dropped
 * `playNewTrackListFromPlaylist`/`TrackListOriginFromPlaylist` (Spotify-library playlist origin,
 * out of scope — see `models/TrackListOrigin.ts`), and calls into `usePlayer()`'s generalized
 * `loadTrackForPlayer(trackId)` (see `../player/PlayerContext.tsx`) instead of the original
 * `(track, scope)` signature.
 */

import { createContext, useState, useContext, ReactNode, useCallback, useMemo } from "react";
import { TrackDetailed } from "./schemas/track/detailed";
import TrackList, { TrackListFromTrack, TrackListFromCriteriaPlaylist } from "./models/TrackList";
import { TrackListOriginFromTrack, TrackListOriginFromCriteriaPlaylist } from "./models/TrackListOrigin";
import { TrackListOriginType } from "./models/TrackListOriginType";
import { CriteriaPlaylistDetailed } from "./schemas/criteria-playlist/detailed";
import { Scope } from "../transport/lib/scope";
import { usePlayer } from "../player/PlayerContext";
import { useTrackListSidebarVisibility } from "./TrackListSidebarVisibilityContext";
import { useListTracks } from "./useUploadedTrack";

interface TrackListContextType {
  trackList: TrackList | null;
  selectedTrack: TrackDetailed | null;
  setSelectedTrack: (track: TrackDetailed | null) => void;
  toTrackAtPosition: (position: number) => void;
  playNewTrackListFromTrackUuid: (track: TrackDetailed, scope: Scope) => void;
  playNewTrackListFromGenrePlaylist: (genrePlaylist: CriteriaPlaylistDetailed, scope: Scope) => void;
}

const TrackListContext = createContext<TrackListContextType | undefined>(undefined);

interface TrackListProviderProps {
  children: ReactNode;
  getBackendBaseUrl: () => string;
}

export function TrackListProvider({ children, getBackendBaseUrl }: TrackListProviderProps) {
  const [trackList, setTrackList] = useState<TrackList | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<TrackDetailed | null>(null);
  const { loadTrackForPlayer } = usePlayer();
  const { showTrackListSidebar } = useTrackListSidebarVisibility();
  const scope = trackList?.origin?.scope ?? null;
  const { data: tracksResponse } = useListTracks(scope, getBackendBaseUrl);

  // Create a memoized track list that updates when tracks changes
  const currentTrackList = useMemo(() => {
    if (!trackList) return null;

    const tracks = tracksResponse?.results || [];

    // If the current track list is from a single track, update it with fresh data
    if (trackList.origin.type === TrackListOriginType.TRACK) {
      const origin = trackList.origin as TrackListOriginFromTrack;

      // Find the updated version of the original track in the fresh data
      const updatedOriginalTrack = tracks.find((track) => track.uuid === origin.track.uuid);

      if (updatedOriginalTrack) {
        // Create a new track list with the updated track
        return new TrackListFromTrack([updatedOriginalTrack], origin);
      }
    }
    // If the current track list is from a genre playlist, update tracks with fresh data
    else if (trackList.origin.type === TrackListOriginType.GENRE_PLAYLIST) {
      const origin = trackList.origin as TrackListOriginFromCriteriaPlaylist;

      // Update all tracks in the playlist with fresh data
      const updatedTracks = trackList.tracks.map((originalTrack) => {
        const updatedTrack = tracks.find((track) => track.uuid === originalTrack.uuid);
        return updatedTrack || originalTrack; // Use updated track if found, otherwise keep original
      });

      // Check if any tracks were actually updated
      const hasUpdates = updatedTracks.some((updatedTrack, index) => updatedTrack !== trackList.tracks[index]);

      if (hasUpdates) {
        return new TrackListFromCriteriaPlaylist(updatedTracks, origin);
      }
    }

    return trackList;
  }, [trackList, tracksResponse]);

  const toTrackAtPosition = useCallback(
    (position: number) => {
      if (currentTrackList && position >= 0 && position < currentTrackList.tracks.length) {
        setSelectedTrack(currentTrackList.tracks[position]);
      }
    },
    [currentTrackList],
  );

  const playNewTrackListFromTrackUuid = useCallback(
    (track: TrackDetailed, scope: Scope) => {
      const origin = new TrackListOriginFromTrack(track, scope);
      const newTrackList = new TrackListFromTrack([track], origin);

      setTrackList(newTrackList);
      setSelectedTrack(track);
      showTrackListSidebar();
      loadTrackForPlayer(track.uuid);
    },
    [showTrackListSidebar, loadTrackForPlayer],
  );

  const playNewTrackListFromGenrePlaylist = useCallback(
    (genrePlaylist: CriteriaPlaylistDetailed, scope: Scope) => {
      const tracks = genrePlaylist.trackPlaylistRelations
        .sort((a, b) => a.position - b.position)
        .map((rel) => rel.track);

      if (tracks.length === 0) {
        console.warn("No tracks found in genre playlist");
        return;
      }

      const origin = new TrackListOriginFromCriteriaPlaylist(genrePlaylist, scope);
      const newTrackList = new TrackListFromCriteriaPlaylist(tracks, origin);

      setTrackList(newTrackList);
      setSelectedTrack(tracks[0]);
      showTrackListSidebar();
      loadTrackForPlayer(tracks[0].uuid);
    },
    [showTrackListSidebar, loadTrackForPlayer],
  );

  const value = useMemo(
    () => ({
      trackList: currentTrackList,
      selectedTrack,
      setSelectedTrack,
      toTrackAtPosition,
      playNewTrackListFromTrackUuid,
      playNewTrackListFromGenrePlaylist,
    }),
    [
      currentTrackList,
      selectedTrack,
      toTrackAtPosition,
      playNewTrackListFromTrackUuid,
      playNewTrackListFromGenrePlaylist,
    ],
  );

  return <TrackListContext.Provider value={value}>{children}</TrackListContext.Provider>;
}

export function useTrackList() {
  const context = useContext(TrackListContext);
  if (!context) {
    throw new Error("useTrackList must be used within a TrackListProvider");
  }
  return context;
}
