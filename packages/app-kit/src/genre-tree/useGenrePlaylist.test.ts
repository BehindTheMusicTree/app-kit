import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { fetchMock, useSessionMock, useQueryWithParseMock, invalidateQueriesMock } =
  vi.hoisted(() => ({
    fetchMock: vi.fn(),
    useSessionMock: vi.fn(),
    useQueryWithParseMock: vi.fn(),
    invalidateQueriesMock: vi.fn(),
  }));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
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

import {
  useListGenrePlaylists,
  useListFullGenrePlaylists,
  useFetchGenrePlaylist,
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
    it("loads the reference tree with exactly one request to the tree endpoint", async () => {
      useSessionMock.mockReturnValue({ session: null, sessionRestored: false });
      fetchMock.mockResolvedValue([{ uuid: "gp1" }]);
      renderHook(() => useListFullGenrePlaylists("reference", getBackendBaseUrl));
      const { queryKey, enabled, queryFn } = useQueryWithParseMock.mock.calls[0][0];

      expect(queryKey).toEqual(["referenceGenrePlaylists", "https://backend.example.com", "full"]);
      expect(enabled).toBe(true);

      const result = await queryFn();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("genre-playlists/tree/", true, false, {}, { treeName: "canonical" });
      expect(result).toEqual([{ uuid: "gp1" }]);
    });

    it("queries the me full endpoint and gates on a restored session with a token", async () => {
      fetchMock.mockResolvedValue({
        overallTotal: 1,
        next: null,
        previous: null,
        results: [{ uuid: "gp1" }],
        page: 1,
        pageSize: 100,
        totalPages: 1,
      });
      renderHook(() => useListFullGenrePlaylists("me", getBackendBaseUrl));
      const { queryKey, enabled, queryFn } = useQueryWithParseMock.mock.calls[0][0];

      expect(queryKey).toEqual(["meGenrePlaylists", "full"]);
      expect(enabled).toBe(true);

      const result = await queryFn();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("me/genre-playlists/", true, true, {}, { page: 1, pageSize: 100, treeName: "canonical" });
      expect(result).toEqual([{ uuid: "gp1" }]);
    });

    it("disables the me query until the session is restored", () => {
      useSessionMock.mockReturnValue({ session: null, sessionRestored: false });
      renderHook(() => useListFullGenrePlaylists("me", getBackendBaseUrl));

      expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
    });

    it("keeps at most 4 me page requests in flight and merges results in page order", async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      fetchMock.mockImplementation(async (_url, _a, _b, _c, { page }: { page: number }) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, (18 - page) % 5));
        inFlight--;
        return { overallTotal: 18, next: null, previous: null, results: [{ uuid: `gp${page}` }], page, pageSize: 1, totalPages: 18 };
      });
      renderHook(() => useListFullGenrePlaylists("me", getBackendBaseUrl));
      const { queryFn } = useQueryWithParseMock.mock.calls[0][0];

      const result = await queryFn();

      expect(fetchMock).toHaveBeenCalledTimes(18);
      expect(maxInFlight).toBe(4);
      expect(result.map((gp: { uuid: string }) => gp.uuid)).toEqual(Array.from({ length: 18 }, (_, i) => `gp${i + 1}`));
    });

    it("returns an empty list with a single me request when totalPages is 0", async () => {
      fetchMock.mockResolvedValueOnce({
        overallTotal: 0,
        next: null,
        previous: null,
        results: [],
        page: 1,
        pageSize: 100,
        totalPages: 0,
      });
      renderHook(() => useListFullGenrePlaylists("me", getBackendBaseUrl));
      const { queryFn } = useQueryWithParseMock.mock.calls[0][0];

      const result = await queryFn();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it("rejects with the page number when a later me page returns no body", async () => {
      fetchMock
        .mockResolvedValueOnce({
          overallTotal: 150,
          next: "https://backend.example.com/me/genre-playlists/?page=2",
          previous: null,
          results: Array.from({ length: 100 }, (_, i) => ({ uuid: `gp${i}` })),
          page: 1,
          pageSize: 100,
          totalPages: 2,
        })
        .mockResolvedValueOnce(null);
      renderHook(() => useListFullGenrePlaylists("me", getBackendBaseUrl));
      const { queryFn } = useQueryWithParseMock.mock.calls[0][0];

      await expect(queryFn()).rejects.toThrow("page 2 returned no body");
    });

    it("rejects when the first me page returns no body", async () => {
      fetchMock.mockResolvedValueOnce(null);
      renderHook(() => useListFullGenrePlaylists("me", getBackendBaseUrl));
      const { queryFn } = useQueryWithParseMock.mock.calls[0][0];

      await expect(queryFn()).rejects.toThrow("page 1 returned no body");
      expect(fetchMock).toHaveBeenCalledTimes(1);
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
