import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { fetchMock, useQueryWithParseMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useQueryWithParseMock: vi.fn(),
}));

vi.mock("../transport/useFetchWrapper", () => ({
  useFetchWrapper: () => ({ fetch: fetchMock }),
}));
vi.mock("../transport/usePlaybackFetch", () => ({
  usePlaybackFetch: () => ({ fetchBound: fetchMock, fetchLatest: fetchMock }),
}));

vi.mock("../transport/lib/use-query-with-parse", () => ({
  useQueryWithParse: (options: unknown) => useQueryWithParseMock(options),
}));

import { useSongSearch } from "./useSongSearch";
import { SongSearchResultsSchema } from "./schemas/song-search";

const getBackendBaseUrl = () => "https://backend.example.com";
const swift = {
  uuid: "3f0d7b1e-8a3c-4d57-9a53-2b7f4f9c0a11",
  title: "Shake It Off",
  artists: [{ uuid: "7c0d7b1e-8a3c-4d57-9a53-2b7f4f9c0a22", name: "Taylor Swift" }],
  genre: null,
  youtubeVideo: null,
  firstReleaseYear: 2014,
};

describe("useSongSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useQueryWithParseMock.mockReturnValue({ data: [swift], isFetching: false, isError: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays disabled below two characters", () => {
    const { result } = renderHook(() => useSongSearch(getBackendBaseUrl, "t"));

    expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
    expect(result.current.songs).toEqual([]);
    expect(result.current.settled).toBe(false);
    expect(result.current.pending).toBe(false);
  });

  it("waits for the debounce before querying, then fetches the trimmed query anonymously", () => {
    const { result } = renderHook(() => useSongSearch(getBackendBaseUrl, " taylor "));

    expect(useQueryWithParseMock.mock.calls.at(-1)?.[0].enabled).toBe(false);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    const { queryKey, enabled, queryFn, schema } = useQueryWithParseMock.mock.calls.at(-1)?.[0];
    expect(queryKey).toEqual(["referenceSongs", "search", { q: "taylor", limit: 8 }]);
    expect(enabled).toBe(true);
    expect(schema).toBe(SongSearchResultsSchema);
    const signal = new AbortController().signal;
    queryFn({ signal });
    expect(fetchMock).toHaveBeenCalledWith("library/songs/search/", true, false, { signal }, { q: "taylor", limit: 8 });
    expect(result.current.songs).toEqual([swift]);
    expect(result.current.settled).toBe(true);
    expect(result.current.pending).toBe(false);
  });

  it("is pending through the debounce and the fetch", () => {
    useQueryWithParseMock.mockReturnValue({ data: undefined, isFetching: true, isError: false });
    const { result } = renderHook(() => useSongSearch(getBackendBaseUrl, "taylor"));

    expect(result.current.pending).toBe(true);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.pending).toBe(true);
  });

  it("keeps the previous results while the next query loads, and clears them below two characters", () => {
    const { result, rerender } = renderHook(({ text }) => useSongSearch(getBackendBaseUrl, text), {
      initialProps: { text: "taylor" },
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    useQueryWithParseMock.mockReturnValue({ data: [swift], isFetching: true, isError: false });

    rerender({ text: "taylor s" });

    expect(useQueryWithParseMock.mock.calls.at(-1)?.[0].placeholderData("previous")).toBe("previous");
    expect(result.current.songs).toEqual([swift]);
    expect(result.current.settled).toBe(false);

    rerender({ text: "t" });

    expect(result.current.songs).toEqual([]);
  });

  it("reports errors and is not settled while fetching", () => {
    useQueryWithParseMock.mockReturnValue({ data: undefined, isFetching: true, isError: true });
    const { result } = renderHook(() => useSongSearch(getBackendBaseUrl, "taylor"));
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.settled).toBe(false);
    expect(result.current.pending).toBe(false);
    expect(result.current.songs).toEqual([]);
  });
});
