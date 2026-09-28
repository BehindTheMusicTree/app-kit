"use client";

/**
 * Adapted from grow-the-music-tree-frontend's original `TrackListContext.tsx`: dropped
 * `playNewTrackListFromPlaylist`/`TrackListOriginFromPlaylist` (Spotify-library playlist origin,
 * out of scope — see `models/TrackListOrigin.ts`), and calls into `usePlayer()`'s generalized
 * `loadTrackForPlayer(trackId)` (see `../player/PlayerContext.tsx`) instead of the original
 * `(track, scope)` signature.
 */

import { createContext, useState, useContext, ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useFetchWrapper } from "../transport/useFetchWrapper";
import { useSession } from "../auth/SessionContext";
import { useQueryWithParse } from "../transport/lib/use-query-with-parse";
import { PaginatedResponseSchema } from "../transport/lib/paginated-response";
import { parseWithLog } from "../transport/lib/parse-with-log";
import { TrackBase } from "./schemas/track/base";
import { CriteriaPlaylistMinimum } from "./schemas/criteria-playlist/minimum";
import { makeTrackPlaylistRelPageSchema } from "./schemas/track-playlist-rel/without-playlist";
import { genrePlaylistEndpoints } from "./api/genre-playlists";
import TrackList, { TrackListFromTrack, TrackListFromCriteriaPlaylist } from "./models/TrackList";
import { TrackListOriginFromTrack, TrackListOriginFromCriteriaPlaylist } from "./models/TrackListOrigin";
import { TrackListOriginType } from "./models/TrackListOriginType";
import { Scope } from "../transport/lib/scope";
import { usePlayer } from "../player/PlayerContext";
import { useTrackListSidebarVisibility } from "./TrackListSidebarVisibilityContext";

const GENRE_PLAYLIST_PAGE_SIZE = 100;
// Load the next page once the selected track is this close to the end of what's loaded, so
// auto-advance and next-track never run out.
const AUTO_LOAD_REMAINING_TRACKS = 10;

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
  /** Fetches the playlist's first tracks page and plays its first track. Rejects on fetch/parse failure. */
  playNewTrackListFromGenrePlaylist: (genrePlaylist: CriteriaPlaylistMinimum, scope: Scope) => Promise<void>;
  /** Appends the next tracks page of the current genre-playlist list; no-op when fully loaded or already loading. */
  loadMore: () => Promise<void>;
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
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const pageSchema = useMemo(() => makeTrackPlaylistRelPageSchema(schema), [schema]);
  // Identifies the latest play request / in-flight page load, so late responses for a list that's
  // no longer current are dropped.
  const latestPlayRequestRef = useRef(0);
  const loadingOriginRef = useRef<TrackListOriginFromCriteriaPlaylist | null>(null);

  const fetchTracksPage = useCallback(
    async (uuid: string, scope: Scope, page: number) => {
      const endpoint = genrePlaylistEndpoints[scope].tracks(uuid);
      const response = await fetch(endpoint, true, scope === "me", {}, { page, pageSize: GENRE_PLAYLIST_PAGE_SIZE });
      const parsed = parseWithLog(pageSchema, response, "fetchGenrePlaylistTracksPage");
      return {
        tracks: parsed.results.map((rel) => rel.track as T),
        total: parsed.overallTotal,
        nextPage: parsed.next ? parsed.page + 1 : null,
      };
    },
    [fetch, pageSchema],
  );

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
      const origin = trackList.origin as TrackListOriginFromCriteriaPlaylist;

      // Update all tracks in the playlist with fresh data
      const updatedTracks = trackList.tracks.map((originalTrack) => {
        const updatedTrack = tracks.find((track) => track.uuid === originalTrack.uuid);
        return updatedTrack || originalTrack; // Use updated track if found, otherwise keep original
      });

      // Check if any tracks were actually updated
      const hasUpdates = updatedTracks.some((updatedTrack, index) => updatedTrack !== trackList.tracks[index]);

      if (hasUpdates) {
        return new TrackListFromCriteriaPlaylist(updatedTracks, origin, trackList.total, trackList.nextPage);
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
      latestPlayRequestRef.current++;
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
    async (genrePlaylist: CriteriaPlaylistMinimum, scope: Scope) => {
      const request = ++latestPlayRequestRef.current;
      let page: Awaited<ReturnType<typeof fetchTracksPage>>;
      try {
        page = await fetchTracksPage(genrePlaylist.uuid, scope, 1);
      } catch (error) {
        if (request !== latestPlayRequestRef.current) return;
        throw error;
      }
      if (request !== latestPlayRequestRef.current) return;
      const { tracks, total, nextPage } = page;

      if (tracks.length === 0) {
        console.warn("No tracks found in genre playlist");
        return;
      }

      const origin = new TrackListOriginFromCriteriaPlaylist(genrePlaylist, scope);
      setTrackList(new TrackListFromCriteriaPlaylist(tracks, origin, total, nextPage));
      setSelectedTrack(tracks[0]);
      showTrackListSidebar();
      loadTrackForPlayer(tracks[0].uuid);
    },
    [fetchTracksPage, showTrackListSidebar, loadTrackForPlayer],
  );

  const loadMore = useCallback(async () => {
    if (!trackList || trackList.nextPage === null) return;
    const origin = trackList.origin as TrackListOriginFromCriteriaPlaylist;
    if (loadingOriginRef.current === origin) return;

    const requestedPage = trackList.nextPage;
    loadingOriginRef.current = origin;
    try {
      const page = await fetchTracksPage(origin.uuid, origin.scope, requestedPage);
      setTrackList((prev) => {
        // A stale loadMore closure can refetch a page that was already appended.
        if (prev?.origin !== origin || prev.nextPage !== requestedPage) return prev;
        // ponytail: page-number paging skips a track when an earlier one is removed server-side
        // between fetches; switch to cursor paging if that matters. Insertions only duplicate, filtered here.
        const loaded = new Set(prev.tracks.map((track) => track.uuid));
        const newTracks = page.tracks.filter((track) => !loaded.has(track.uuid));
        return new TrackListFromCriteriaPlaylist([...prev.tracks, ...newTracks], origin, page.total, page.nextPage);
      });
    } finally {
      if (loadingOriginRef.current === origin) loadingOriginRef.current = null;
    }
  }, [trackList, fetchTracksPage]);

  useEffect(() => {
    if (!currentTrackList || currentTrackList.nextPage === null || !selectedTrack) return;
    const index = currentTrackList.tracks.findIndex((track) => track.uuid === selectedTrack.uuid);
    if (index !== -1 && currentTrackList.tracks.length - index <= AUTO_LOAD_REMAINING_TRACKS) {
      loadMore().catch((error) => console.error("Failed to load more genre playlist tracks:", error));
    }
  }, [currentTrackList, selectedTrack, loadMore]);

  const value = useMemo(
    () => ({
      trackList: currentTrackList,
      selectedTrack,
      setSelectedTrack,
      toTrackAtPosition,
      playNewTrackListFromTrackUuid,
      playNewTrackListFromGenrePlaylist,
      loadMore,
    }),
    [
      currentTrackList,
      selectedTrack,
      toTrackAtPosition,
      playNewTrackListFromTrackUuid,
      playNewTrackListFromGenrePlaylist,
      loadMore,
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
