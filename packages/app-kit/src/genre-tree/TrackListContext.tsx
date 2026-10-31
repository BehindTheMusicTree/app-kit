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
import { libraryEndpoints } from "./api/library";
import TrackList, { TrackListFromTrack, TrackListFromCriteriaPlaylist, TrackListFromArtist } from "./models/TrackList";
import {
  TrackListOriginFromTrack,
  TrackListOriginFromCriteriaPlaylist,
  TrackListOriginFromArtist,
  ArtistTrackListOriginInput,
  ArtistSongsOrdering,
} from "./models/TrackListOrigin";
import { TrackListOriginType } from "./models/TrackListOriginType";
import { Scope } from "../transport/lib/scope";
import { usePlayer } from "../player/PlayerContext";
import type { PlayerTrackEndEvent } from "../player/PlayerContext";
import { useTrackListSidebarVisibility } from "./TrackListSidebarVisibilityContext";
import type { GenrePlaylistUuid, GenreUuid } from "./schemas/ids";
import { isSong, songUnplayableReason } from "./schemas/song/detailed";

const TRACKS_PAGE_SIZE = 100;
// Load the next page once the selected track is this close to the end of what's loaded, so
// auto-advance and next-track never run out.
const AUTO_LOAD_REMAINING_TRACKS = 10;
// Keep each blocked embed visible long enough for the row reposition and dim state to register.
const AUTO_SKIP_DELAY_MS = 1_000;

function isTrackPlayable<T extends TrackBase>(track: T, runtimeUnplayableTrackIds: ReadonlySet<string>) {
  return (
    !runtimeUnplayableTrackIds.has(track.uuid) &&
    (!isSong(track) || songUnplayableReason(track) === null)
  );
}

export function useListTracks<T>(
  scope: Scope | null,
  getBackendBaseUrl: () => string,
  schema: z.ZodType<T, unknown>,
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

export type PlayGenrePlaylistOptions = { startSongUuid?: string };

export type PlayArtistOptions = { ordering: ArtistSongsOrdering; startSongUuid?: string; genreUuid?: GenreUuid };

interface TrackListContextType<T extends TrackBase> {
  trackList: TrackList<T> | null;
  selectedTrack: T | null;
  setSelectedTrack: (track: T | null) => void;
  autoAdvanceScrollRequest: { id: number; trackUuid: string } | null;
  runtimeUnplayableTrackIds: ReadonlySet<string>;
  hasNextTrack: boolean;
  hasPreviousTrack: boolean;
  playNextTrack: () => void;
  playPreviousTrack: () => void;
  toTrackAtPosition: (position: number) => void;
  playNewTrackListFromTrackUuid: (track: T, scope: Scope) => void;
  /**
   * Fetches the playlist's first tracks page and plays its first track. Rejects on fetch/parse failure.
   * With `startSongUuid`, the list starts at that track (`?from=`), so earlier tracks aren't
   * queued; rejects when the playlist doesn't contain it.
   */
  playNewTrackListFromGenrePlaylist: (
    genrePlaylist: CriteriaPlaylistMinimum,
    scope: Scope,
    options?: PlayGenrePlaylistOptions,
  ) => Promise<void>;
  /**
   * Fetches the artist's first page of playable songs in `ordering` and plays the first one;
   * later pages load lazily. With `startSongUuid`, the list starts at that song (`?from=`); with
   * `genreUuid`, only the songs in that genre's subtree are queued (`?genre=`).
   * Rejects on fetch/parse failure, or when the artist's playable songs don't contain it.
   */
  playNewTrackListFromArtist: (
    artist: ArtistTrackListOriginInput,
    scope: Scope,
    options: PlayArtistOptions,
  ) => Promise<void>;
  /** One page of a genre playlist's tracks, parsed with the provider's track schema; `from` starts the list at that track. */
  fetchGenrePlaylistTracksPage: (
    uuid: GenrePlaylistUuid,
    scope: Scope,
    page: number,
    from?: string,
  ) => Promise<GenrePlaylistTracksPage<T>>;
  /** Appends the next tracks page of the current genre-playlist or artist list; no-op when fully loaded or already loading. */
  loadMore: () => Promise<void>;
  /**
   * Swaps in a fresh copy of a listed track (matched by `uuid`), and the selected track if it is
   * that one; no-op when the track isn't listed. Call it from a track mutation's `onSuccess`.
   */
  updateTrack: (track: T) => void;
}

const TrackListContext = createContext<TrackListContextType<TrackBase> | undefined>(undefined);

interface TrackListProviderProps<T extends TrackBase> {
  children: ReactNode;
  getBackendBaseUrl: () => string;
  schema: z.ZodType<T, unknown>;
}

export function TrackListProvider<T extends TrackBase>({
  children,
  getBackendBaseUrl,
  schema,
}: TrackListProviderProps<T>) {
  const [trackList, setTrackList] = useState<TrackList<T> | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<T | null>(null);
  const [autoAdvanceScrollRequest, setAutoAdvanceScrollRequest] = useState<{
    id: number;
    trackUuid: string;
  } | null>(null);
  const [runtimeUnplayableTrackIds, setRuntimeUnplayableTrackIds] = useState<ReadonlySet<string>>(() => new Set());
  const { loadTrackForPlayer, setOnTrackEnd } = usePlayer();
  const { showTrackListSidebar } = useTrackListSidebarVisibility();
  const { fetch } = useFetchWrapper(getBackendBaseUrl);
  const pageSchema = useMemo(() => makeTrackPlaylistRelPageSchema(schema), [schema]);
  // Identifies the latest play request / in-flight page load, so late responses for a list that's
  // no longer current are dropped.
  const latestPlayRequestRef = useRef(0);
  const autoAdvanceScrollRequestIdRef = useRef(0);
  const delayedTrackLoadRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingOriginRef = useRef<TrackListOriginFromCriteriaPlaylist | TrackListOriginFromArtist | null>(null);
  const pendingAdvanceRef = useRef<{
    trackId: string;
    origin: TrackList<T>["origin"];
    delayLoad: boolean;
  } | null>(null);

  const clearDelayedTrackLoad = useCallback(() => {
    if (delayedTrackLoadRef.current !== null) {
      clearTimeout(delayedTrackLoadRef.current);
      delayedTrackLoadRef.current = null;
    }
  }, []);

  const requestAutoAdvanceScroll = useCallback((trackUuid: string) => {
    setAutoAdvanceScrollRequest({ id: ++autoAdvanceScrollRequestIdRef.current, trackUuid });
  }, []);

  const loadTrackAfterSkipDelay = useCallback(
    (trackUuid: string) => {
      clearDelayedTrackLoad();
      delayedTrackLoadRef.current = setTimeout(() => {
        delayedTrackLoadRef.current = null;
        loadTrackForPlayer(trackUuid);
      }, AUTO_SKIP_DELAY_MS);
    },
    [clearDelayedTrackLoad, loadTrackForPlayer],
  );

  const fetchTracksPage = useCallback(
    async (uuid: GenrePlaylistUuid, scope: Scope, page: number, from?: string): Promise<GenrePlaylistTracksPage<T>> => {
      const endpoint = genrePlaylistEndpoints[scope].tracks(uuid);
      const params = { page, pageSize: TRACKS_PAGE_SIZE, ...(from && { from }) };
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

  const artistPageSchema = useMemo(() => PaginatedResponseSchema(schema), [schema]);

  const fetchArtistTracksPage = useCallback(
    async (origin: TrackListOriginFromArtist, page: number): Promise<GenrePlaylistTracksPage<T>> => {
      const params = {
        artist: origin.uuid,
        playable: true,
        ordering: origin.ordering,
        page,
        pageSize: TRACKS_PAGE_SIZE,
        ...(origin.from && { from: origin.from }),
        ...(origin.genreUuid && { genre: origin.genreUuid }),
      };
      const response = await fetch(
        libraryEndpoints.reference.songs.list(),
        true,
        false,
        {},
        params,
        false,
        // A start song that isn't playable 404s; surface it as a rejection, not the global error.
        page === 1 && !!origin.from,
      );
      const parsed = parseWithLog(artistPageSchema, response, "fetchArtistTracksPage");
      return { tracks: parsed.results, total: parsed.overallTotal, nextPage: parsed.next ? parsed.page + 1 : null };
    },
    [fetch, artistPageSchema],
  );

  const advanceAfterTrackEnd = useCallback(
    (event?: PlayerTrackEndEvent) => {
      const completedTrackId = event?.trackId ?? selectedTrack?.uuid;
      if (!completedTrackId || !trackList) return;
      // Ignore late media events from a track that is no longer selected.
      if (selectedTrack && selectedTrack.uuid !== completedTrackId) return;

      const isEmbeddingBlocked = event?.error?.code === 101 || event?.error?.code === 150;
      if (event?.error) {
        setRuntimeUnplayableTrackIds((previous) => new Set(previous).add(completedTrackId));
        if (!isEmbeddingBlocked) return;
      }

      const currentIndex = trackList.tracks.findIndex((track) => track.uuid === completedTrackId);
      if (currentIndex === -1) return;
      const nextTrack = trackList.tracks
        .slice(currentIndex + 1)
        .find((track) => isTrackPlayable(track, runtimeUnplayableTrackIds));
      if (!nextTrack) {
        pendingAdvanceRef.current = trackList.nextPage === null
          ? null
          : { trackId: completedTrackId, origin: trackList.origin, delayLoad: isEmbeddingBlocked };
        return;
      }

      pendingAdvanceRef.current = null;
      requestAutoAdvanceScroll(nextTrack.uuid);
      setSelectedTrack(nextTrack);
      if (isEmbeddingBlocked) loadTrackAfterSkipDelay(nextTrack.uuid);
      else loadTrackForPlayer(nextTrack.uuid);
    },
    [
      trackList,
      loadTrackAfterSkipDelay,
      loadTrackForPlayer,
      requestAutoAdvanceScroll,
      runtimeUnplayableTrackIds,
      selectedTrack,
    ],
  );

  useEffect(() => {
    setOnTrackEnd(trackList && selectedTrack ? advanceAfterTrackEnd : null);
    return () => setOnTrackEnd(null);
  }, [advanceAfterTrackEnd, trackList, selectedTrack, setOnTrackEnd]);

  const toTrackAtPosition = useCallback(
    (position: number) => {
      if (trackList && position >= 0 && position < trackList.tracks.length) {
        clearDelayedTrackLoad();
        setAutoAdvanceScrollRequest(null);
        setSelectedTrack(trackList.tracks[position]);
      }
    },
    [clearDelayedTrackLoad, trackList],
  );

  const playNewTrackListFromTrackUuid = useCallback(
    (track: T, scope: Scope) => {
      latestPlayRequestRef.current++;
      clearDelayedTrackLoad();
      setAutoAdvanceScrollRequest(null);
      const origin = new TrackListOriginFromTrack(track, scope);
      const newTrackList = new TrackListFromTrack([track], origin);

      setTrackList(newTrackList);
      setSelectedTrack(track);
      showTrackListSidebar();
      loadTrackForPlayer(track.uuid);
    },
    [clearDelayedTrackLoad, showTrackListSidebar, loadTrackForPlayer],
  );

  const playNewTrackListFromGenrePlaylist = useCallback(
    async (genrePlaylist: CriteriaPlaylistMinimum, scope: Scope, options?: PlayGenrePlaylistOptions) => {
      clearDelayedTrackLoad();
      const request = ++latestPlayRequestRef.current;
      const from = options?.startSongUuid;
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
      setAutoAdvanceScrollRequest(null);
      setTrackList(new TrackListFromCriteriaPlaylist(page.tracks, origin, page.total, page.nextPage));
      setSelectedTrack(startTrack);
      showTrackListSidebar();
      loadTrackForPlayer(startTrack.uuid);
    },
    [clearDelayedTrackLoad, fetchTracksPage, showTrackListSidebar, loadTrackForPlayer],
  );

  const playNewTrackListFromArtist = useCallback(
    async (artist: ArtistTrackListOriginInput, scope: Scope, options: PlayArtistOptions) => {
      if (scope !== "reference") throw new Error("Artist track lists only support the reference scope");
      clearDelayedTrackLoad();
      const request = ++latestPlayRequestRef.current;
      const from = options.startSongUuid;
      const origin = new TrackListOriginFromArtist(artist, scope, options.ordering, from, options.genreUuid);
      let page: GenrePlaylistTracksPage<T>;
      try {
        page = await fetchArtistTracksPage(origin, 1);
      } catch (error) {
        if (request !== latestPlayRequestRef.current) return;
        throw error;
      }
      if (request !== latestPlayRequestRef.current) return;

      const startTrack = page.tracks[0];
      if (from && startTrack?.uuid !== from) {
        throw new Error(`Artist ${artist.uuid} did not start at song ${from}`);
      }
      if (!startTrack) {
        console.warn("No playable songs found for artist");
        return;
      }

      setTrackList(new TrackListFromArtist(page.tracks, origin, page.total, page.nextPage));
      setAutoAdvanceScrollRequest(null);
      setSelectedTrack(startTrack);
      showTrackListSidebar();
      loadTrackForPlayer(startTrack.uuid);
    },
    [clearDelayedTrackLoad, fetchArtistTracksPage, showTrackListSidebar, loadTrackForPlayer],
  );

  const updateTrack = useCallback((track: T) => {
    setTrackList((prev) => {
      if (!prev || !prev.tracks.some((listed) => listed.uuid === track.uuid)) return prev;
      const tracks = prev.tracks.map((listed) => (listed.uuid === track.uuid ? track : listed));
      return new TrackList(tracks, prev.origin, prev.total, prev.nextPage);
    });
    setSelectedTrack((prev) => (prev?.uuid === track.uuid ? track : prev));
  }, []);

  const loadMore = useCallback(async () => {
    if (!trackList || trackList.nextPage === null) return;
    const origin = trackList.origin;
    if (!(origin instanceof TrackListOriginFromCriteriaPlaylist || origin instanceof TrackListOriginFromArtist)) return;
    if (loadingOriginRef.current === origin) return;

    const requestedPage = trackList.nextPage;
    loadingOriginRef.current = origin;
    try {
      const page =
        origin instanceof TrackListOriginFromArtist
          ? await fetchArtistTracksPage(origin, requestedPage)
          : await fetchTracksPage(origin.criteriaPlaylist.uuid, origin.scope, requestedPage, origin.from);
      setTrackList((prev) => {
        // A stale loadMore closure can refetch a page that was already appended.
        if (prev?.origin !== origin || prev.nextPage !== requestedPage) return prev;
        // ponytail: page-number paging skips a track when an earlier one is removed server-side
        // between fetches; switch to cursor paging if that matters. Insertions only duplicate, filtered here.
        const loaded = new Set(prev.tracks.map((track) => track.uuid));
        const tracks = [...prev.tracks, ...page.tracks.filter((track) => !loaded.has(track.uuid))];
        return origin instanceof TrackListOriginFromArtist
          ? new TrackListFromArtist(tracks, origin, page.total, page.nextPage)
          : new TrackListFromCriteriaPlaylist(tracks, origin, page.total, page.nextPage);
      });
    } finally {
      if (loadingOriginRef.current === origin) loadingOriginRef.current = null;
    }
  }, [trackList, fetchTracksPage, fetchArtistTracksPage]);

  const selectedTrackIndex = trackList?.tracks.findIndex((track) => track.uuid === selectedTrack?.uuid) ?? -1;
  const nextTrack =
    trackList && selectedTrackIndex >= 0
      ? trackList.tracks
          .slice(selectedTrackIndex + 1)
          .find((track) => isTrackPlayable(track, runtimeUnplayableTrackIds)) ?? null
      : null;
  const previousTrack =
    trackList && selectedTrackIndex > 0
      ? trackList.tracks
          .slice(0, selectedTrackIndex)
          .reverse()
          .find((track) => isTrackPlayable(track, runtimeUnplayableTrackIds)) ?? null
      : null;
  const hasNextTrack = nextTrack !== null || (selectedTrackIndex >= 0 && trackList?.nextPage != null);
  const hasPreviousTrack = previousTrack !== null;

  const playNextTrack = useCallback(() => {
    if (!trackList || !selectedTrack || selectedTrackIndex < 0) return;
    clearDelayedTrackLoad();
    if (nextTrack) {
      pendingAdvanceRef.current = null;
      requestAutoAdvanceScroll(nextTrack.uuid);
      setSelectedTrack(nextTrack);
      loadTrackForPlayer(nextTrack.uuid);
      return;
    }
    if (trackList.nextPage === null) return;

    pendingAdvanceRef.current = { trackId: selectedTrack.uuid, origin: trackList.origin, delayLoad: false };
    loadMore().catch((error) => {
      pendingAdvanceRef.current = null;
      console.error("Failed to load more tracks:", error);
    });
  }, [clearDelayedTrackLoad, trackList, loadMore, loadTrackForPlayer, nextTrack, selectedTrack, selectedTrackIndex]);

  const playPreviousTrack = useCallback(() => {
    if (!previousTrack) return;
    clearDelayedTrackLoad();
    pendingAdvanceRef.current = null;
    requestAutoAdvanceScroll(previousTrack.uuid);
    setSelectedTrack(previousTrack);
    loadTrackForPlayer(previousTrack.uuid);
  }, [clearDelayedTrackLoad, loadTrackForPlayer, previousTrack, requestAutoAdvanceScroll]);

  useEffect(() => {
    const pending = pendingAdvanceRef.current;
    if (!pending) return;
    if (
      !trackList ||
      trackList.origin !== pending.origin ||
      selectedTrack?.uuid !== pending.trackId
    ) {
      pendingAdvanceRef.current = null;
      return;
    }

    const currentIndex = trackList.tracks.findIndex((track) => track.uuid === pending.trackId);
    if (currentIndex === -1) {
      pendingAdvanceRef.current = null;
      return;
    }
    const nextTrack = trackList.tracks
      .slice(currentIndex + 1)
      .find((track) => isTrackPlayable(track, runtimeUnplayableTrackIds));
    if (nextTrack) {
      pendingAdvanceRef.current = null;
      requestAutoAdvanceScroll(nextTrack.uuid);
      setSelectedTrack(nextTrack);
      if (pending.delayLoad) loadTrackAfterSkipDelay(nextTrack.uuid);
      else loadTrackForPlayer(nextTrack.uuid);
    } else if (trackList.nextPage === null) {
      pendingAdvanceRef.current = null;
    } else {
      loadMore().catch((error) => console.error("Failed to load more tracks:", error));
    }
  }, [
    trackList,
    loadMore,
    loadTrackAfterSkipDelay,
    loadTrackForPlayer,
    requestAutoAdvanceScroll,
    runtimeUnplayableTrackIds,
    selectedTrack,
  ]);

  useEffect(() => clearDelayedTrackLoad, [clearDelayedTrackLoad]);

  useEffect(() => {
    if (!trackList || trackList.nextPage === null || !selectedTrack) return;
    const index = trackList.tracks.findIndex((track) => track.uuid === selectedTrack.uuid);
    if (index !== -1 && trackList.tracks.length - index <= AUTO_LOAD_REMAINING_TRACKS) {
      loadMore().catch((error) => console.error("Failed to load more tracks:", error));
    }
  }, [trackList, selectedTrack, loadMore]);

  const value = useMemo(
    () => ({
      trackList: trackList,
      selectedTrack,
      setSelectedTrack,
      autoAdvanceScrollRequest,
      runtimeUnplayableTrackIds,
      hasNextTrack,
      hasPreviousTrack,
      playNextTrack,
      playPreviousTrack,
      toTrackAtPosition,
      playNewTrackListFromTrackUuid,
      playNewTrackListFromGenrePlaylist,
      playNewTrackListFromArtist,
      fetchGenrePlaylistTracksPage: fetchTracksPage,
      loadMore,
      updateTrack,
    }),
    [
      trackList,
      selectedTrack,
      autoAdvanceScrollRequest,
      runtimeUnplayableTrackIds,
      hasNextTrack,
      hasPreviousTrack,
      playNextTrack,
      playPreviousTrack,
      toTrackAtPosition,
      playNewTrackListFromTrackUuid,
      playNewTrackListFromGenrePlaylist,
      playNewTrackListFromArtist,
      fetchTracksPage,
      loadMore,
      updateTrack,
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
