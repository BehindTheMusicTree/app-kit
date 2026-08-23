"use client";

/**
 * Adapted from grow-the-music-tree-frontend's original `TrackListContext.tsx`: dropped
 * `playNewTrackListFromPlaylist`/`TrackListOriginFromPlaylist` (Spotify-library playlist origin,
 * out of scope — see `models/TrackListOrigin.ts`), and calls into `usePlayer()`'s generalized
 * `loadTrackForPlayer(trackId)` (see `../player/PlayerContext.tsx`) instead of the original
 * `(track, scope)` signature.
 */

import { createContext, useState, useContext, ReactNode, useCallback, useMemo } from "react";
import { z } from "zod";
import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useSession } from "../auth/SessionContext";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { PaginatedResponseSchema } from "../transport/lib/paginated-response";
import { TrackBase } from "./schemas/track/base";
import TrackList, { TrackListFromTrack, TrackListFromCriteriaPlaylist } from "./models/TrackList";
import {
  TrackListOriginFromTrack,
  TrackListOriginFromCriteriaPlaylist,
  CriteriaPlaylistDetailedLike,
} from "./models/TrackListOrigin";
import { TrackListOriginType } from "./models/TrackListOriginType";
import { Scope } from "../transport/lib/scope";
import { usePlayer } from "../player/PlayerContext";
import { useTrackListSidebarVisibility } from "./TrackListSidebarVisibilityContext";

export function useListTracks<T>(
  scope: Scope | null,
  getBackendBaseUrl: () => string,
  schema: z.ZodType<T>,
  listEndpoint: (page: number) => string,
  listQueryKey: (page: number) => readonly unknown[],
  page = 1,
  pageSize: number | string = 50,
) {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const { session, sessionRestored } = useSession();

  return useQueryWithParse({
    queryKey: listQueryKey(page),
    queryFn: async () => {
      if (scope == null) return null;
      return fetch(listEndpoint(page), true, scope === "me", {}, { page, pageSize });
    },
    schema: PaginatedResponseSchema(schema),
    context: "useListTracks",
    enabled: scope != null && (scope === "reference" || (sessionRestored && !!session?.accessToken)),
  });
}

interface TrackListContextType<T extends TrackBase> {
  trackList: TrackList<T> | null;
  selectedTrack: T | null;
  setSelectedTrack: (track: T | null) => void;
  toTrackAtPosition: (position: number) => void;
  playNewTrackListFromTrackUuid: (track: T, scope: Scope) => void;
  playNewTrackListFromGenrePlaylist: (genrePlaylist: CriteriaPlaylistDetailedLike<T>, scope: Scope) => void;
}

const TrackListContext = createContext<TrackListContextType<TrackBase> | undefined>(undefined);

interface TrackListProviderProps<T extends TrackBase> {
  children: ReactNode;
  getBackendBaseUrl: () => string;
  schema: z.ZodType<T>;
  listEndpoint: (page: number) => string;
  listQueryKey: (page: number) => readonly unknown[];
}

export function TrackListProvider<T extends TrackBase>({
  children,
  getBackendBaseUrl,
  schema,
  listEndpoint,
  listQueryKey,
}: TrackListProviderProps<T>) {
  const [trackList, setTrackList] = useState<TrackList<T> | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<T | null>(null);
  const { loadTrackForPlayer } = usePlayer();
  const { showTrackListSidebar } = useTrackListSidebarVisibility();
  const scope = trackList?.origin?.scope ?? null;
  const { data: tracksResponse } = useListTracks(scope, getBackendBaseUrl, schema, listEndpoint, listQueryKey);

  // Create a memoized track list that updates when tracks changes
  const currentTrackList = useMemo(() => {
    if (!trackList) return null;

    const tracks = tracksResponse?.results || [];

    // If the current track list is from a single track, update it with fresh data
    if (trackList.origin.type === TrackListOriginType.TRACK) {
      const origin = trackList.origin as TrackListOriginFromTrack<T>;

      // Find the updated version of the original track in the fresh data
      const updatedOriginalTrack = tracks.find((track) => track.uuid === origin.track.uuid);

      if (updatedOriginalTrack) {
        // Create a new track list with the updated track
        return new TrackListFromTrack([updatedOriginalTrack], origin);
      }
    }
    // If the current track list is from a genre playlist, update tracks with fresh data
    else if (trackList.origin.type === TrackListOriginType.GENRE_PLAYLIST) {
      const origin = trackList.origin as TrackListOriginFromCriteriaPlaylist<T>;

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
    (track: T, scope: Scope) => {
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
    (genrePlaylist: CriteriaPlaylistDetailedLike<T>, scope: Scope) => {
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

  return (
    <TrackListContext.Provider value={value as unknown as TrackListContextType<TrackBase>}>
      {children}
    </TrackListContext.Provider>
  );
}

export function useTrackList<T extends TrackBase = TrackBase>() {
  const context = useContext(TrackListContext);
  if (!context) {
    throw new Error("useTrackList must be used within a TrackListProvider");
  }
  return context as unknown as TrackListContextType<T>;
}
