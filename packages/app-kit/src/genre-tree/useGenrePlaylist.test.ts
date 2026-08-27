import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { fetchMock, useSessionMock, useQueryWithParseMock, useMutationMock, invalidateQueriesMock, parseWithLogMock } =
  vi.hoisted(() => ({
    fetchMock: vi.fn(),
    useSessionMock: vi.fn(),
    useQueryWithParseMock: vi.fn(),
    useMutationMock: vi.fn(),
    invalidateQueriesMock: vi.fn(),
    parseWithLogMock: vi.fn(),
  }));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
    useMutation: (options: unknown) => useMutationMock(options),
  };
});

vi.mock("../transport/useFetchWrapper", () => ({
  useFetchWrapper: () => ({ fetch: fetchMock }),
}));

vi.mock("../auth/SessionContext", () => ({
  useSession: () => useSessionMock(),
}));

vi.mock("../transport/lib/use-query-with-parse", () => ({
  useQueryWithParse: (options: unknown) => useQueryWithParseMock(options),
}));

vi.mock("../transport/lib/parse-with-log", () => ({
  parseWithLog: (...args: unknown[]) => parseWithLogMock(...args),
}));

import {
  useListGenrePlaylists,
  useListFullGenrePlaylists,
  useFetchGenrePlaylist,
  useFetchGenrePlaylistDetailed,
  useInvalidateAllGenrePlaylistQueries,
} from "./useGenrePlaylist";
import { CriteriaPlaylistSimpleSchema } from "./schemas/criteria-playlist/simple";

const getBackendBaseUrl = () => "https://backend.example.com";

describe("useGenrePlaylist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionMock.mockReturnValue({ session: { accessToken: "token" }, sessionRestored: true });
  });

  describe("useListGenrePlaylists", () => {
    it("queries the me list endpoint and is enabled with a restored session and token", () => {
      renderHook(() => useListGenrePlaylists(2, 50, getBackendBaseUrl));
      const { queryKey, enabled, queryFn } = useQueryWithParseMock.mock.calls[0][0];

      expect(queryKey).toEqual(["meGenrePlaylists", "list", 2]);
      expect(enabled).toBe(true);

      queryFn();
      expect(fetchMock).toHaveBeenCalledWith("me/genre-playlists/", true, true, {}, { page: 2, pageSize: 50 });
    });

    it("disables the query until the session is restored", () => {
      useSessionMock.mockReturnValue({ session: null, sessionRestored: false });
      renderHook(() => useListGenrePlaylists(1, 50, getBackendBaseUrl));

      expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
    });

    it("invalidateGenrePlaylists invalidates the me all query key", () => {
      const { result } = renderHook(() => useListGenrePlaylists(1, 50, getBackendBaseUrl));

      result.current.invalidateGenrePlaylists();

      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["meGenrePlaylists"] });
    });
  });

  describe("useListFullGenrePlaylists", () => {
    it("queries the reference full endpoint and is always enabled for the reference scope", async () => {
      useSessionMock.mockReturnValue({ session: null, sessionRestored: false });
      fetchMock.mockResolvedValue({
        overallTotal: 1,
        next: null,
        previous: null,
        results: [{ uuid: "gp1" }],
        page: 1,
        pageSize: 1000,
        totalPages: 1,
      });
      renderHook(() => useListFullGenrePlaylists("reference", getBackendBaseUrl));
      const { queryKey, enabled, queryFn } = useQueryWithParseMock.mock.calls[0][0];

      expect(queryKey).toEqual(["referenceGenrePlaylists", "https://backend.example.com", "full"]);
      expect(enabled).toBe(true);

      await queryFn();
      expect(fetchMock).toHaveBeenCalledWith("genre-playlists/", true, false, {}, { page: 1, pageSize: 1000 });
    });

    it("queries the me full endpoint and gates on a restored session with a token", async () => {
      fetchMock.mockResolvedValue({
        overallTotal: 1,
        next: null,
        previous: null,
        results: [{ uuid: "gp1" }],
        page: 1,
        pageSize: 1000,
        totalPages: 1,
      });
      renderHook(() => useListFullGenrePlaylists("me", getBackendBaseUrl));
      const { queryKey, enabled, queryFn } = useQueryWithParseMock.mock.calls[0][0];

      expect(queryKey).toEqual(["meGenrePlaylists", "full"]);
      expect(enabled).toBe(true);

      await queryFn();
      expect(fetchMock).toHaveBeenCalledWith("me/genre-playlists/", true, true, {}, { page: 1, pageSize: 1000 });
    });

    it("disables the me query until the session is restored", () => {
      useSessionMock.mockReturnValue({ session: null, sessionRestored: false });
      renderHook(() => useListFullGenrePlaylists("me", getBackendBaseUrl));

      expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
    });

    it("follows `next` and merges results when the backend clamps pageSize below overallTotal", async () => {
      fetchMock
        .mockResolvedValueOnce({
          overallTotal: 250,
          next: "https://backend.example.com/genre-playlists/?page=2",
          previous: null,
          results: Array.from({ length: 100 }, (_, i) => ({ uuid: `gp${i}` })),
          page: 1,
          pageSize: 100,
          totalPages: 3,
        })
        .mockResolvedValueOnce({
          overallTotal: 250,
          next: "https://backend.example.com/genre-playlists/?page=3",
          previous: "https://backend.example.com/genre-playlists/?page=1",
          results: Array.from({ length: 100 }, (_, i) => ({ uuid: `gp${100 + i}` })),
          page: 2,
          pageSize: 100,
          totalPages: 3,
        })
        .mockResolvedValueOnce({
          overallTotal: 250,
          next: null,
          previous: "https://backend.example.com/genre-playlists/?page=2",
          results: Array.from({ length: 50 }, (_, i) => ({ uuid: `gp${200 + i}` })),
          page: 3,
          pageSize: 100,
          totalPages: 3,
        });
      renderHook(() => useListFullGenrePlaylists("reference", getBackendBaseUrl));
      const { queryFn } = useQueryWithParseMock.mock.calls[0][0];

      const result = await queryFn();

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock).toHaveBeenNthCalledWith(1, "genre-playlists/", true, false, {}, { page: 1, pageSize: 1000 });
      expect(fetchMock).toHaveBeenNthCalledWith(2, "genre-playlists/", true, false, {}, { page: 2, pageSize: 1000 });
      expect(fetchMock).toHaveBeenNthCalledWith(3, "genre-playlists/", true, false, {}, { page: 3, pageSize: 1000 });
      expect(result.results).toHaveLength(250);
      expect(result.overallTotal).toBe(250);
    });

    it("invalidateFullGenrePlaylists invalidates the scoped full query key", () => {
      const { result } = renderHook(() => useListFullGenrePlaylists("reference", getBackendBaseUrl));

      result.current.invalidateFullGenrePlaylists();

      expect(invalidateQueriesMock).toHaveBeenCalledWith({
        queryKey: ["referenceGenrePlaylists", "https://backend.example.com", "full"],
      });
    });
  });

  describe("useFetchGenrePlaylist", () => {
    it("fetches the me detail endpoint and gates on a restored session with a token", () => {
      renderHook(() => useFetchGenrePlaylist("gp1", getBackendBaseUrl, CriteriaPlaylistSimpleSchema));
      const { queryKey, enabled, queryFn } = useQueryWithParseMock.mock.calls[0][0];

      expect(queryKey).toEqual(["meGenrePlaylists", "gp1"]);
      expect(enabled).toBe(true);

      queryFn();
      expect(fetchMock).toHaveBeenCalledWith("me/genre-playlists/gp1/");
    });

    it("disables the query when uuid is empty", () => {
      renderHook(() => useFetchGenrePlaylist("", getBackendBaseUrl, CriteriaPlaylistSimpleSchema));

      expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
    });

    it("disables the query until the session is restored", () => {
      useSessionMock.mockReturnValue({ session: null, sessionRestored: false });
      renderHook(() => useFetchGenrePlaylist("gp1", getBackendBaseUrl, CriteriaPlaylistSimpleSchema));

      expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
    });
  });

  describe("useFetchGenrePlaylistDetailed", () => {
    it("mutationFn fetches the reference detail endpoint and parses the response", async () => {
      fetchMock.mockResolvedValue({ uuid: "gp1" });
      parseWithLogMock.mockReturnValue({ uuid: "gp1" });
      renderHook(() => useFetchGenrePlaylistDetailed("reference", getBackendBaseUrl, CriteriaPlaylistSimpleSchema));
      const { mutationFn } = useMutationMock.mock.calls[0][0];

      const result = await mutationFn("gp1");

      expect(fetchMock).toHaveBeenCalledWith("genre-playlists/gp1/", true, false);
      expect(parseWithLogMock).toHaveBeenCalledWith(
        CriteriaPlaylistSimpleSchema,
        { uuid: "gp1" },
        "useFetchGenrePlaylistDetailed",
      );
      expect(result).toEqual({ uuid: "gp1" });
    });

    it("mutationFn fetches the me detail endpoint", async () => {
      fetchMock.mockResolvedValue({ uuid: "gp1" });
      renderHook(() => useFetchGenrePlaylistDetailed("me", getBackendBaseUrl, CriteriaPlaylistSimpleSchema));
      const { mutationFn } = useMutationMock.mock.calls[0][0];

      await mutationFn("gp1");

      expect(fetchMock).toHaveBeenCalledWith("me/genre-playlists/gp1/", true, true);
    });
  });

  describe("useInvalidateAllGenrePlaylistQueries", () => {
    it("returns a function that invalidates the me and reference genre playlist query keys", () => {
      const { result } = renderHook(() => useInvalidateAllGenrePlaylistQueries());

      result.current();

      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["meGenrePlaylists"] });
      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["meGenrePlaylists", "full"] });
      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["referenceGenrePlaylists"] });
    });
  });
});
