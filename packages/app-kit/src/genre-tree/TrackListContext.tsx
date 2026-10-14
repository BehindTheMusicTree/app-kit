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
import TrackList, { TrackListFromTrack, TrackListFromCriteriaPlaylist, TrackListFromArtist } from "./models/TrackList";
import {
  TrackListOriginFromTrack,
  TrackListOriginFromCriteriaPlaylist,
  TrackListOriginFromArtist,
  ArtistTrackListOriginInput,
} from "./models/TrackListOrigin";
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

export type GenrePlaylistTracksPage<T> = { tracks: T[]; total: number; nextPage: number | null };

export type PlayGenrePlaylistOptions = { startRecordingUuid?: string };

interface TrackListContextType<T extends TrackBase> {
  trackList: TrackList<T> | null;
  selectedTrack: T | null;
  setSelectedTrack: (track: T | null) => void;
  toTrackAtPosition: (position: number) => void;
  playNewTrackListFromTrackUuid: (track: T, scope: Scope) => void;
  /**
   * Fetches the playlist's first tracks page and plays its first track. Rejects on fetch/parse failure.
   * With `startRecordingUuid`, the list starts at that track (`?from=`), so earlier tracks aren't
   * queued; rejects when the playlist doesn't contain it.
   */
  playNewTrackListFromGenrePlaylist: (
    genrePlaylist: CriteriaPlaylistMinimum,
    scope: Scope,
    options?: PlayGenrePlaylistOptions,
  ) => Promise<void>;
  /**
   * Plays a caller-supplied track list, starting at `startTrackUuid`. The list is not refetched
   * or paged; pass every track that should be queued.
   */
  playNewTrackList: (tracks: T[], startTrackUuid: string, origin: ArtistTrackListOriginInput, scope: Scope) => void;
  /** One page of a genre playlist's tracks, parsed with the provider's track schema; `from` starts the list at that track. */
  fetchGenrePlaylistTracksPage: (
    uuid: string,
    scope: Scope,
    page: number,
    from?: string,
  ) => Promise<GenrePlaylistTracksPage<T>>;
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
    async (uuid: string, scope: Scope, page: number, from?: string): Promise<GenrePlaylistTracksPage<T>> => {
      const endpoint = genrePlaylistEndpoints[scope].tracks(uuid);
      const params = { page, pageSize: GENRE_PLAYLIST_PAGE_SIZE, ...(from && { from }) };
      const response = await fetch(endpoint, true, scope === "me", {}, params);
      const parsed = parseWithLog(pageSchema, response, "fetchGenrePlaylistTracksPage");
      return {
        tracks: parsed.results.map((rel) => rel.track as T),
        total: parsed.overallTotal,
        nextPage: parsed.next ? parsed.page + 1 : null,
      };
    },
    [fetch, pageSchema],
  );

  // Swap in fresh data for any listed track the list query returns, whatever the list's origin.
  const currentTrackList = useMemo(() => {
    if (!trackList) return null;
    const freshTracks = new Map((tracksResponse?.results ?? []).map((track) => [track.uuid, track]));
    const tracks = trackList.tracks.map((track) => freshTracks.get(track.uuid) ?? track);
    if (tracks.every((track, index) => track === trackList.tracks[index])) return trackList;
    return new TrackList(tracks, trackList.origin, trackList.total, trackList.nextPage);
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
    async (genrePlaylist: CriteriaPlaylistMinimum, scope: Scope, options?: PlayGenrePlaylistOptions) => {
      const request = ++latestPlayRequestRef.current;
      const from = options?.startRecordingUuid;
      let page: GenrePlaylistTracksPage<T>;
      try {
        page = await fetchTracksPage(genrePlaylist.uuid, scope, 1, from);
      } catch (error) {
        if (request !== latestPlayRequestRef.current) return;
        throw error;
      }
      if (request !== latestPlayRequestRef.current) return;

      const startTrack = page.tracks[0];
      if (from && startTrack?.uuid !== from) {
        throw new Error(`Genre playlist ${genrePlaylist.uuid} did not start at track ${from}`);
      }
      if (!startTrack) {
        console.warn("No playable tracks found in genre playlist");
        return;
      }

      const origin = new TrackListOriginFromCriteriaPlaylist(genrePlaylist, scope, from);
      setTrackList(new TrackListFromCriteriaPlaylist(page.tracks, origin, page.total, page.nextPage));
      setSelectedTrack(startTrack);
      showTrackListSidebar();
      loadTrackForPlayer(startTrack.uuid);
    },
    [fetchTracksPage, showTrackListSidebar, loadTrackForPlayer],
  );

  const playNewTrackList = useCallback(
    (tracks: T[], startTrackUuid: string, origin: ArtistTrackListOriginInput, scope: Scope) => {
      const startTrack = tracks.find((track) => track.uuid === startTrackUuid);
      if (!startTrack) throw new Error(`playNewTrackList: track ${startTrackUuid} is not in the list`);
      latestPlayRequestRef.current++;
      setTrackList(new TrackListFromArtist(tracks, new TrackListOriginFromArtist(origin, scope)));
      setSelectedTrack(startTrack);
      showTrackListSidebar();
      loadTrackForPlayer(startTrack.uuid);
    },
    [showTrackListSidebar, loadTrackForPlayer],
  );

  const loadMore = useCallback(async () => {
    if (!trackList || trackList.nextPage === null) return;
    const origin = trackList.origin as TrackListOriginFromCriteriaPlaylist;
    if (loadingOriginRef.current === origin) return;

    const requestedPage = trackList.nextPage;
    loadingOriginRef.current = origin;
    try {
      const page = await fetchTracksPage(origin.uuid, origin.scope, requestedPage, origin.from);
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
      playNewTrackList,
      fetchGenrePlaylistTracksPage: fetchTracksPage,
      loadMore,
    }),
    [
      currentTrackList,
      selectedTrack,
      toTrackAtPosition,
      playNewTrackListFromTrackUuid,
      playNewTrackListFromGenrePlaylist,
      playNewTrackList,
      fetchTracksPage,
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
