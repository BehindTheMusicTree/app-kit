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
    playlists: [],
    playCount: 0,
    archived: false,
    createdOn: "2024-01-01T00:00:00.000Z",
    updatedOn: null,
    ...overrides,
  } as TrackBase;
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

  describe("playNewTrackListFromGenrePlaylist", () => {
    it("sorts tracks by position, selects the first, shows the sidebar, and loads it", () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const trackA = makeTrack("a", "Track A");
      const trackB = makeTrack("b", "Track B");
      const genrePlaylist = {
        uuid: "p1",
        name: "My Playlist",
        trackPlaylistRelations: [
          { track: trackB, position: 2 },
          { track: trackA, position: 1 },
        ],
      };

      act(() => {
        result.current.playNewTrackListFromGenrePlaylist(genrePlaylist, "reference");
      });

      expect(result.current.trackList?.tracks).toEqual([trackA, trackB]);
      expect(result.current.selectedTrack).toEqual(trackA);
      expect(showTrackListSidebarMock).toHaveBeenCalled();
      expect(loadTrackForPlayerMock).toHaveBeenCalledWith("a");
    });

    it("warns and does nothing when the playlist has no tracks", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const genrePlaylist = { uuid: "p1", name: "Empty", trackPlaylistRelations: [] };

      act(() => {
        result.current.playNewTrackListFromGenrePlaylist(genrePlaylist, "me");
      });

      expect(warnSpy).toHaveBeenCalledWith("No tracks found in genre playlist");
      expect(result.current.trackList).toBeNull();
      expect(showTrackListSidebarMock).not.toHaveBeenCalled();
      expect(loadTrackForPlayerMock).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe("toTrackAtPosition", () => {
    it("selects the track at a valid position", () => {
      const { result } = renderHook(() => useTrackList(), { wrapper });
      const trackA = makeTrack("a", "Track A");
      const trackB = makeTrack("b", "Track B");

      act(() => {
        result.current.playNewTrackListFromGenrePlaylist(
          {
            uuid: "p1",
            name: "P",
            trackPlaylistRelations: [
              { track: trackA, position: 0 },
              { track: trackB, position: 1 },
            ],
          },
          "me",
        );
      });

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

    it("updates matching tracks in a genre playlist and keeps others unchanged", () => {
      const trackA = makeTrack("a", "Track A");
      const trackB = makeTrack("b", "Track B");
      const updatedB = makeTrack("b", "Track B Updated");
      useQueryWithParseMock.mockReturnValue({ data: { results: [updatedB] } });

      const { result } = renderHook(() => useTrackList(), { wrapper });

      act(() => {
        result.current.playNewTrackListFromGenrePlaylist(
          {
            uuid: "p1",
            name: "P",
            trackPlaylistRelations: [
              { track: trackA, position: 0 },
              { track: trackB, position: 1 },
            ],
          },
          "me",
        );
      });

      expect(result.current.trackList?.tracks).toEqual([trackA, updatedB]);
    });

    it("leaves the genre playlist list untouched when nothing changed", () => {
      const trackA = makeTrack("a", "Track A");
      useQueryWithParseMock.mockReturnValue({ data: { results: [] } });

      const { result } = renderHook(() => useTrackList(), { wrapper });

      act(() => {
        result.current.playNewTrackListFromGenrePlaylist(
          { uuid: "p1", name: "P", trackPlaylistRelations: [{ track: trackA, position: 0 }] },
          "me",
        );
      });

      expect(result.current.trackList?.tracks).toEqual([trackA]);
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
