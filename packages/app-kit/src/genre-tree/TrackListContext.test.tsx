import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { z } from "zod";
import type { ReactNode } from "react";

const { fetchMock, useSessionMock, useQueryWithParseMock, loadTrackForPlayerMock, showTrackListSidebarMock } =
  vi.hoisted(() => ({
    fetchMock: vi.fn(),
    useSessionMock: vi.fn(),
    useQueryWithParseMock: vi.fn(),
    loadTrackForPlayerMock: vi.fn(),
    showTrackListSidebarMock: vi.fn(),
  }));

vi.mock("../transport/useFetchWrapper", () => ({
  useFetchWrapper: () => ({ fetch: fetchMock }),
}));

vi.mock("../auth/SessionContext", () => ({
  useSession: () => useSessionMock(),
}));

vi.mock("../transport/lib/use-query-with-parse", () => ({
  useQueryWithParse: (options: unknown) => useQueryWithParseMock(options),
}));

vi.mock("../player/PlayerContext", () => ({
  usePlayer: () => ({ loadTrackForPlayer: loadTrackForPlayerMock }),
}));

vi.mock("./TrackListSidebarVisibilityContext", () => ({
  useTrackListSidebarVisibility: () => ({ showTrackListSidebar: showTrackListSidebarMock }),
}));

import { TrackListProvider, useTrackList, useListTracks } from "./TrackListContext";
import type { TrackBase } from "./schemas/track/base";
import { TrackListOriginType } from "./models/TrackListOriginType";
import { makeGenrePlaylistUuid } from "./testing";

const getBackendBaseUrl = () => "https://backend.example.com";
const listEndpoint = (page: number) => `tracks/?page=${page}`;
const listQueryKey = (page: number) => ["tracks", "list", page] as const;
const schema = z.custom<TrackBase>();

function makeTrack(uuid: string, title: string, overrides: Partial<TrackBase> = {}): TrackBase {
  return {
    uuid,
    title,
    artists: null,
    album: null,
    trackNumber: null,
    genre: { uuid: "g1", name: "Jazz" } as unknown as TrackBase["genre"],
    rating: null,
    language: null,
    playCount: 0,
    createdOn: "2024-01-01T00:00:00.000Z",
    updatedOn: null,
    ...overrides,
  } as TrackBase;
}

type RenderedTrackList = { current: ReturnType<typeof useTrackList> };

function makePage(tracks: TrackBase[], { page = 1, next = false, total = tracks.length } = {}) {
  return {
    overallTotal: total,
    next: next ? `https://backend.example.com/genre-playlists/p1/tracks/?page=${page + 1}` : null,
    previous: null,
    results: tracks.map((track, index) => ({ position: index + 1, track })),
    page,
    pageSize: 100,
    totalPages: 1,
  };
}

function makeArtistPage(tracks: TrackBase[], { page = 1, next = false, total = tracks.length } = {}) {
  return {
    overallTotal: total,
    next: next ? `https://backend.example.com/library/songs/?page=${page + 1}` : null,
    previous: null,
    results: tracks,
    page,
    pageSize: 100,
    totalPages: 1,
  };
}

function makeTracks(count: number, prefix = "t") {
  return Array.from({ length: count }, (_, index) => makeTrack(`${prefix}${index}`, `Track ${index}`));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const genrePlaylist = { uuid: makeGenrePlaylistUuid("p1"), name: "My Playlist" };

async function playGenre(result: RenderedTrackList, page: ReturnType<typeof makePage>, scope: "me" | "reference" = "me") {
  fetchMock.mockResolvedValueOnce(page);
  await act(async () => {
    await result.current.playNewTrackListFromGenrePlaylist(genrePlaylist, scope);
  });
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <TrackListProvider
      getBackendBaseUrl={getBackendBaseUrl}
      schema={schema}
      listEndpoint={listEndpoint}
      listQueryKey={listQueryKey}
    >
      {children}
    </TrackListProvider>
  );
}

describe("TrackListContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionMock.mockReturnValue({ session: { accessToken: "token" }, sessionRestored: true });
    useQueryWithParseMock.mockReturnValue({ data: undefined });
  });

  describe("useTrackList", () => {
    it("throws when used outside a TrackListProvider", () => {
      expect(() => renderHook(() => useTrackList())).toThrow(
        "useTrackList must be used within a TrackListProvider",
      );
    });

    it("starts with no track list and no selected track", () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });

      expect(result.current.trackList).toBeNull();
      expect(result.current.selectedTrack).toBeNull();
    });
  });

  describe("playNewTrackListFromTrackUuid", () => {
    it("sets the track list and selected track, shows the sidebar, and loads the track", () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const track = makeTrack("t1", "Song One");

      act(() => {
        result.current.playNewTrackListFromTrackUuid(track, "me");
      });

      expect(result.current.selectedTrack).toEqual(track);
      expect(result.current.trackList?.tracks).toEqual([track]);
      expect(showTrackListSidebarMock).toHaveBeenCalled();
      expect(loadTrackForPlayerMock).toHaveBeenCalledWith("t1");
    });
  });

  describe("playNewTrackListFromArtist", () => {
    const artist = { uuid: "a1", name: "Miles Davis" };

    it("fetches the first playable page, starts the artist origin, and loads lazily", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const tracks = makeTracks(3);
      fetchMock.mockResolvedValueOnce(makeArtistPage(tracks, { next: true, total: 5 }));

      await act(async () => {
        await result.current.playNewTrackListFromArtist(artist, "reference", { ordering: "-albumYear" });
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "library/songs/",
        true,
        false,
        {},
        { artist: "a1", playable: true, ordering: "-albumYear", page: 1, pageSize: 100 },
        false,
        false,
      );
      expect(result.current.trackList?.tracks).toEqual(tracks);
      expect(result.current.trackList?.total).toBe(5);
      expect(result.current.trackList?.nextPage).toBe(2);
      expect(result.current.trackList?.origin).toMatchObject({
        type: TrackListOriginType.ARTIST,
        label: "Miles Davis",
        uuid: "a1",
        scope: "reference",
        ordering: "-albumYear",
      });
      expect(result.current.selectedTrack).toEqual(tracks[0]);
      expect(showTrackListSidebarMock).toHaveBeenCalled();
      expect(loadTrackForPlayerMock).toHaveBeenCalledWith("t0");
    });

    it("starts at the requested song with ?from= and keeps it for later pages", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      fetchMock.mockResolvedValueOnce(makeArtistPage(makeTracks(2).slice(1), { next: true }));

      await act(async () => {
        await result.current.playNewTrackListFromArtist(artist, "reference", {
          ordering: "title",
          startSongUuid: "t1",
        });
      });
      fetchMock.mockResolvedValueOnce(makeArtistPage(makeTracks(1, "u"), { page: 2 }));
      await act(async () => {
        await result.current.loadMore();
      });

      expect(fetchMock.mock.calls[0][4]).toMatchObject({ from: "t1", page: 1 });
      expect(fetchMock.mock.calls[1][4]).toMatchObject({ from: "t1", page: 2, artist: "a1", ordering: "title" });
      expect(loadTrackForPlayerMock).toHaveBeenCalledWith("t1");
    });

    it("loadMore appends page 2 and finishes paging", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      fetchMock.mockResolvedValueOnce(makeArtistPage(makeTracks(20), { next: true, total: 21 }));
      await act(async () => {
        await result.current.playNewTrackListFromArtist(artist, "reference", { ordering: "title" });
      });
      const page2 = makeTracks(1, "u");
      fetchMock.mockResolvedValueOnce(makeArtistPage(page2, { page: 2, total: 21 }));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.trackList?.tracks).toHaveLength(21);
      expect(result.current.trackList?.tracks[20]).toEqual(page2[0]);
      expect(result.current.trackList?.nextPage).toBeNull();
      expect(result.current.trackList?.origin.type).toBe(TrackListOriginType.ARTIST);
    });

    it("rejects when the list does not start at the requested song", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      fetchMock.mockResolvedValueOnce(makeArtistPage(makeTracks(2)));

      await act(async () => {
        await expect(
          result.current.playNewTrackListFromArtist(artist, "reference", { ordering: "title", startSongUuid: "t1" }),
        ).rejects.toThrow("Artist a1 did not start at song t1");
      });
      expect(loadTrackForPlayerMock).not.toHaveBeenCalled();
    });

    it("skips the global error for the first page when a start song is given", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      fetchMock.mockResolvedValueOnce(makeArtistPage(makeTracks(1)));

      await act(async () => {
        await result.current.playNewTrackListFromArtist(artist, "reference", {
          ordering: "title",
          startSongUuid: "t0",
        });
      });

      expect(fetchMock.mock.calls[0][6]).toBe(true);
    });

    it("drops an artist response that arrives after a newer play request", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const slow = deferred<unknown>();
      fetchMock.mockReturnValueOnce(slow.promise);
      let first!: Promise<void>;
      act(() => {
        first = result.current.playNewTrackListFromArtist(artist, "reference", { ordering: "-albumYear" });
      });

      await playGenre(result, makePage(makeTracks(1, "new")));
      await act(async () => {
        slow.resolve(makeArtistPage(makeTracks(1, "old")));
        await first;
      });

      expect(result.current.selectedTrack?.uuid).toBe("new0");
      expect(loadTrackForPlayerMock).toHaveBeenCalledTimes(1);
    });

    it("swallows the failure of an artist request superseded by a newer play", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const slow = deferred<unknown>();
      fetchMock.mockReturnValueOnce(slow.promise);
      let first!: Promise<void>;
      act(() => {
        first = result.current.playNewTrackListFromArtist(artist, "reference", { ordering: "-albumYear" });
      });

      await playGenre(result, makePage(makeTracks(1, "new")));
      await act(async () => {
        slow.reject(new Error("offline"));
        await expect(first).resolves.toBeUndefined();
      });

      expect(result.current.selectedTrack?.uuid).toBe("new0");
    });

    it("rejects when the first artist page fails and the request is current", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      fetchMock.mockRejectedValueOnce(new Error("offline"));

      await act(async () => {
        await expect(result.current.playNewTrackListFromArtist(artist, "reference", { ordering: "-albumYear" })).rejects.toThrow("offline");
      });
    });

    it("warns and does nothing when the artist has no playable songs", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { result } = renderHook(() => useTrackList(), { wrapper });
      fetchMock.mockResolvedValueOnce(makeArtistPage([]));

      await act(async () => {
        await result.current.playNewTrackListFromArtist(artist, "reference", { ordering: "-albumYear" });
      });

      expect(warnSpy).toHaveBeenCalledWith("No playable songs found for artist");
      expect(result.current.trackList).toBeNull();

      warnSpy.mockRestore();
    });

    it("rejects the me scope without fetching", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });

      await act(async () => {
        await expect(
          result.current.playNewTrackListFromArtist(artist, "me", { ordering: "title" }),
        ).rejects.toThrow("Artist track lists only support the reference scope");
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("playNewTrackListFromGenrePlaylist", () => {
    it("fetches the first reference page, selects the first track, shows the sidebar, and loads it", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const [trackA, trackB] = makeTracks(2);

      await playGenre(result, makePage([trackA, trackB], { next: true, total: 250 }), "reference");

      expect(fetchMock).toHaveBeenCalledWith(`genre-playlists/${makeGenrePlaylistUuid("p1")}/tracks/`, true, false, {}, { page: 1, pageSize: 100 });
      expect(result.current.trackList?.tracks).toEqual([trackA, trackB]);
      expect(result.current.trackList?.total).toBe(250);
      expect(result.current.trackList?.nextPage).toBe(2);
      expect(result.current.selectedTrack).toEqual(trackA);
      expect(showTrackListSidebarMock).toHaveBeenCalled();
      expect(loadTrackForPlayerMock).toHaveBeenCalledWith("t0");
    });

    it("fetches the me-scoped endpoint with auth and has no next page on the last page", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });

      await playGenre(result, makePage(makeTracks(1)), "me");

      expect(fetchMock).toHaveBeenCalledWith(`me/genre-playlists/${makeGenrePlaylistUuid("p1")}/tracks/`, true, true, {}, { page: 1, pageSize: 100 });
      expect(result.current.trackList?.nextPage).toBeNull();
    });

    it("starts the list at startSongUuid in one request and keeps `from` for later pages", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const first = makeTracks(3, "b");
      fetchMock
        .mockResolvedValueOnce(makePage(first, { page: 1, next: true, total: 250 }))
        .mockResolvedValueOnce(makePage(makeTracks(1, "u"), { page: 2, total: 250 }));

      await act(async () => {
        await result.current.playNewTrackListFromGenrePlaylist(genrePlaylist, "me", { startSongUuid: "b0" });
      });

      expect(fetchMock).toHaveBeenNthCalledWith(1, `me/genre-playlists/${makeGenrePlaylistUuid("p1")}/tracks/`, true, true, {}, {
        page: 1,
        pageSize: 100,
        from: "b0",
      });
      expect(result.current.selectedTrack).toEqual(first[0]);
      expect(loadTrackForPlayerMock).toHaveBeenCalledWith("b0");
      // The start track is near the end of the loaded page, so auto-load fetches page 2 with the same `from`.
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenLastCalledWith(`me/genre-playlists/${makeGenrePlaylistUuid("p1")}/tracks/`, true, true, {}, {
        page: 2,
        pageSize: 100,
        from: "b0",
      });
      expect(result.current.trackList?.tracks.map((track) => track.uuid)).toEqual(["b0", "b1", "b2", "u0"]);
    });

    it("rejects when the first returned track is not startSongUuid", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      fetchMock.mockResolvedValueOnce(makePage(makeTracks(2, "a")));

      await expect(
        act(async () => {
          await result.current.playNewTrackListFromGenrePlaylist(genrePlaylist, "me", { startSongUuid: "b0" });
        }),
      ).rejects.toThrow("did not start at track b0");

      expect(result.current.trackList).toBeNull();
      expect(loadTrackForPlayerMock).not.toHaveBeenCalled();
    });

    it("rejects when the playlist doesn't contain startSongUuid (404)", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      // The fetch wrapper reports a backend 404 as a connectivity error and resolves null.
      fetchMock.mockResolvedValueOnce(null);

      await expect(
        act(async () => {
          await result.current.playNewTrackListFromGenrePlaylist(genrePlaylist, "me", { startSongUuid: "b0" });
        }),
      ).rejects.toThrow("received null response");

      expect(loadTrackForPlayerMock).not.toHaveBeenCalled();
    });

    it("warns and does nothing when the playlist has no tracks", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { result } = renderHook(() => useTrackList(), { wrapper });

      await playGenre(result, makePage([]));

      expect(warnSpy).toHaveBeenCalledWith("No playable tracks found in genre playlist");
      expect(result.current.trackList).toBeNull();
      expect(showTrackListSidebarMock).not.toHaveBeenCalled();
      expect(loadTrackForPlayerMock).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("drops a response that arrives after a newer play request", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const slow = deferred<unknown>();
      fetchMock.mockReturnValueOnce(slow.promise);
      let first!: Promise<void>;
      act(() => {
        first = result.current.playNewTrackListFromGenrePlaylist({ uuid: makeGenrePlaylistUuid("old"), name: "Old" }, "me");
      });

      await playGenre(result, makePage(makeTracks(1, "new")));
      await act(async () => {
        slow.resolve(makePage(makeTracks(1, "old")));
        await first;
      });

      expect(result.current.trackList?.origin.uuid).toBe(makeGenrePlaylistUuid("p1"));
      expect(result.current.selectedTrack?.uuid).toBe("new0");
      expect(loadTrackForPlayerMock).toHaveBeenCalledTimes(1);
    });

    it("drops a response that arrives after a single track started playing", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const slow = deferred<unknown>();
      fetchMock.mockReturnValueOnce(slow.promise);
      let genrePlay!: Promise<void>;
      act(() => {
        genrePlay = result.current.playNewTrackListFromGenrePlaylist(genrePlaylist, "me");
      });

      const single = makeTrack("x", "X");
      act(() => {
        result.current.playNewTrackListFromTrackUuid(single, "me");
      });
      await act(async () => {
        slow.resolve(makePage(makeTracks(1)));
        await genrePlay;
      });

      expect(result.current.trackList?.tracks).toEqual([single]);
      expect(loadTrackForPlayerMock).toHaveBeenCalledTimes(1);
    });

    it("swallows the failure of a request superseded by a newer play", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const slow = deferred<unknown>();
      fetchMock.mockReturnValueOnce(slow.promise);
      let first!: Promise<void>;
      act(() => {
        first = result.current.playNewTrackListFromGenrePlaylist({ uuid: makeGenrePlaylistUuid("old"), name: "Old" }, "me");
      });

      await playGenre(result, makePage(makeTracks(1, "new")));
      await act(async () => {
        slow.reject(new Error("offline"));
        await expect(first).resolves.toBeUndefined();
      });

      expect(result.current.selectedTrack?.uuid).toBe("new0");
    });

    it("rejects when the page fails schema validation", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result } = renderHook(() => useTrackList(), { wrapper });
      fetchMock.mockResolvedValueOnce({ results: "nope" });

      await act(async () => {
        await expect(result.current.playNewTrackListFromGenrePlaylist(genrePlaylist, "me")).rejects.toBeDefined();
      });

      expect(result.current.trackList).toBeNull();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("loadMore", () => {
    it("does nothing without a track list", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("does nothing when there is no next page", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      act(() => {
        result.current.playNewTrackListFromTrackUuid(makeTrack("a", "A"), "me");
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("appends the next page, skipping tracks already loaded, and updates total and next page", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const firstPage = makeTracks(20);
      await playGenre(result, makePage(firstPage, { next: true, total: 40 }));
      const secondPage = [firstPage[19], ...makeTracks(3, "u")];
      fetchMock.mockResolvedValueOnce(makePage(secondPage, { page: 2, total: 41 }));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(fetchMock).toHaveBeenLastCalledWith(`me/genre-playlists/${makeGenrePlaylistUuid("p1")}/tracks/`, true, true, {}, { page: 2, pageSize: 100 });
      expect(result.current.trackList?.tracks.map((track) => track.uuid)).toEqual([
        ...firstPage.map((track) => track.uuid),
        "u0",
        "u1",
        "u2",
      ]);
      expect(result.current.trackList?.total).toBe(41);
      expect(result.current.trackList?.nextPage).toBeNull();
    });

    it("fetches a page only once while a load is in flight", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      await playGenre(result, makePage(makeTracks(20), { next: true }));
      const pending = deferred<unknown>();
      fetchMock.mockReturnValueOnce(pending.promise);

      let first!: Promise<void>;
      await act(async () => {
        first = result.current.loadMore();
        await result.current.loadMore();
      });
      await act(async () => {
        pending.resolve(makePage(makeTracks(1, "u"), { page: 2 }));
        await first;
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.current.trackList?.tracks).toHaveLength(21);
    });

    it("ignores a page refetched by a stale loadMore after it was already appended", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      await playGenre(result, makePage(makeTracks(20), { next: true }));
      const staleLoadMore = result.current.loadMore;
      fetchMock.mockResolvedValueOnce(makePage(makeTracks(1, "u"), { page: 2, next: true }));
      await act(async () => {
        await result.current.loadMore();
      });

      fetchMock.mockResolvedValueOnce(makePage(makeTracks(1, "v"), { page: 2 }));
      await act(async () => {
        await staleLoadMore();
      });

      expect(result.current.trackList?.tracks).toHaveLength(21);
      expect(result.current.trackList?.nextPage).toBe(3);
    });

    it("discards a page that lands after a different list started playing", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      await playGenre(result, makePage(makeTracks(20), { next: true }));
      const pending = deferred<unknown>();
      fetchMock.mockReturnValueOnce(pending.promise);
      let load!: Promise<void>;
      act(() => {
        load = result.current.loadMore();
      });

      const other = makeTrack("x", "X");
      act(() => {
        result.current.playNewTrackListFromTrackUuid(other, "me");
      });
      await act(async () => {
        pending.resolve(makePage(makeTracks(1, "u"), { page: 2 }));
        await load;
      });

      expect(result.current.trackList?.tracks).toEqual([other]);
    });

    it("releases the in-flight guard when the fetch fails", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      await playGenre(result, makePage(makeTracks(20), { next: true }));
      fetchMock.mockRejectedValueOnce(new Error("offline"));

      await act(async () => {
        await expect(result.current.loadMore()).rejects.toThrow("offline");
      });
      fetchMock.mockResolvedValueOnce(makePage(makeTracks(1, "u"), { page: 2 }));
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.trackList?.tracks).toHaveLength(21);
    });
  });

  describe("auto-load", () => {
    it("loads the next page once the selected track is within 10 of the end", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      await playGenre(result, makePage(makeTracks(15), { next: true }));
      expect(fetchMock).toHaveBeenCalledTimes(1);

      fetchMock.mockResolvedValueOnce(makePage(makeTracks(1, "u"), { page: 2 }));
      await act(async () => {
        result.current.toTrackAtPosition(5);
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.current.trackList?.tracks).toHaveLength(16);
    });

    it("ignores a selected track that isn't in the list", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      await playGenre(result, makePage(makeTracks(15), { next: true }));

      act(() => {
        result.current.setSelectedTrack(makeTrack("elsewhere", "Elsewhere"));
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("logs when the automatic load fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const error = new Error("offline");
      fetchMock.mockResolvedValueOnce(makePage(makeTracks(5), { next: true })).mockRejectedValueOnce(error);

      await act(async () => {
        await result.current.playNewTrackListFromGenrePlaylist(genrePlaylist, "me");
      });

      await vi.waitFor(() =>
        expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load more tracks:", error),
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe("toTrackAtPosition", () => {
    it("selects the track at a valid position", async () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const trackA = makeTrack("a", "Track A");
      const trackB = makeTrack("b", "Track B");

      await playGenre(result, makePage([trackA, trackB]));

      act(() => {
        result.current.toTrackAtPosition(1);
      });

      expect(result.current.selectedTrack).toEqual(trackB);
    });

    it("does nothing for an out-of-bounds position", () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const track = makeTrack("a", "Track A");

      act(() => {
        result.current.playNewTrackListFromTrackUuid(track, "me");
      });
      act(() => {
        result.current.toTrackAtPosition(5);
      });

      expect(result.current.selectedTrack).toEqual(track);
    });

    it("does nothing for a negative position", () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const track = makeTrack("a", "Track A");

      act(() => {
        result.current.playNewTrackListFromTrackUuid(track, "me");
      });
      act(() => {
        result.current.toTrackAtPosition(-1);
      });

      expect(result.current.selectedTrack).toEqual(track);
    });

    it("does nothing when there is no current track list", () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });

      act(() => {
        result.current.toTrackAtPosition(0);
      });

      expect(result.current.selectedTrack).toBeNull();
    });
  });

  describe("currentTrackList refresh from query results", () => {
    it("replaces the track with fresh data when the origin is a single track", () => {
      const original = makeTrack("t1", "Old Title");
      const updated = makeTrack("t1", "New Title");
      useQueryWithParseMock.mockReturnValue({ data: { results: [updated] } });

      const { result } = renderHook(() => useTrackList(), { wrapper });

      act(() => {
        result.current.playNewTrackListFromTrackUuid(original, "me");
      });

      expect(result.current.trackList?.tracks).toEqual([updated]);
    });

    it("keeps the original track list when no matching fresh track is found", () => {
      const original = makeTrack("t1", "Old Title");
      useQueryWithParseMock.mockReturnValue({ data: { results: [makeTrack("other", "Other")] } });

      const { result } = renderHook(() => useTrackList(), { wrapper });

      act(() => {
        result.current.playNewTrackListFromTrackUuid(original, "me");
      });

      expect(result.current.trackList?.tracks).toEqual([original]);
    });

    it("updates matching tracks in a genre playlist and keeps others unchanged", async () => {
      const trackA = makeTrack("a", "Track A");
      const trackB = makeTrack("b", "Track B");
      const updatedB = makeTrack("b", "Track B Updated");
      useQueryWithParseMock.mockReturnValue({ data: { results: [updatedB] } });

      const { result } = renderHook(() => useTrackList(), { wrapper });

      await playGenre(result, makePage([trackA, trackB], { next: true, total: 7 }));

      expect(result.current.trackList?.tracks).toEqual([trackA, updatedB]);
      expect(result.current.trackList?.total).toBe(7);
      expect(result.current.trackList?.nextPage).toBe(2);
    });

    it("leaves the genre playlist list untouched when nothing changed", async () => {
      const trackA = makeTrack("a", "Track A");
      useQueryWithParseMock.mockReturnValue({ data: { results: [] } });

      const { result } = renderHook(() => useTrackList(), { wrapper });

      await playGenre(result, makePage([trackA]));

      expect(result.current.trackList?.tracks).toEqual([trackA]);
    });

    it("updates matching tracks in an artist list", async () => {
      const trackA = makeTrack("a", "Track A");
      const trackB = makeTrack("b", "Track B");
      const updatedA = makeTrack("a", "Track A Updated");
      useQueryWithParseMock.mockReturnValue({ data: { results: [updatedA] } });

      const { result } = renderHook(() => useTrackList(), { wrapper });

      fetchMock.mockResolvedValueOnce(makeArtistPage([trackA, trackB]));
      await act(async () => {
        await result.current.playNewTrackListFromArtist({ uuid: "ar1", name: "Artist" }, "reference", {
          ordering: "title",
        });
      });

      expect(result.current.trackList?.tracks).toEqual([updatedA, trackB]);
      expect(result.current.trackList?.origin.type).toBe(TrackListOriginType.ARTIST);
    });
  });

  describe("useListTracks", () => {
    it("is disabled and skips fetching when scope is null", async () => {
      renderHook(() => useListTracks(null, getBackendBaseUrl, schema, listEndpoint, listQueryKey));
      const { enabled, queryFn } = useQueryWithParseMock.mock.calls[0][0];

      expect(enabled).toBe(false);
      await expect(queryFn()).resolves.toBeNull();
    });

    it("is always enabled for the reference scope and fetches the endpoint", async () => {
      fetchMock.mockResolvedValue({ results: [] });
      renderHook(() => useListTracks("reference", getBackendBaseUrl, schema, listEndpoint, listQueryKey, 2, 25));
      const { enabled, queryFn, queryKey } = useQueryWithParseMock.mock.calls[0][0];

      expect(enabled).toBe(true);
      expect(queryKey).toEqual(["tracks", "list", 2]);

      await queryFn();
      expect(fetchMock).toHaveBeenCalledWith("tracks/?page=2", true, false, {}, { page: 2, pageSize: 25 });
    });

    it("gates the me scope on a restored session with an access token", () => {
      renderHook(() => useListTracks("me", getBackendBaseUrl, schema, listEndpoint, listQueryKey));
      expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(true);
    });

    it("disables the me scope until the session is restored", () => {
      useSessionMock.mockReturnValue({ session: null, sessionRestored: false });
      renderHook(() => useListTracks("me", getBackendBaseUrl, schema, listEndpoint, listQueryKey));

      expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
    });
  });
});
