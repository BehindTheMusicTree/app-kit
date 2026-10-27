import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { keepPreviousData } from "@tanstack/react-query";

const { fetchMock, useQueryWithParseMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useQueryWithParseMock: vi.fn(),
}));

vi.mock("../transport/useFetchWrapper", () => ({
  useFetchWrapper: () => ({ fetch: fetchMock }),
}));

vi.mock("../transport/lib/use-query-with-parse", () => ({
  useQueryWithParse: (options: unknown) => useQueryWithParseMock(options),
}));

import { useArtistSearch } from "./useArtistSearch";
import { ArtistSearchResultsSchema } from "./schemas/artist-search";

const getBackendBaseUrl = () => "https://backend.example.com";
const swift = {
  uuid: "3f0d7b1e-8a3c-4d57-9a53-2b7f4f9c0a11",
  name: "Taylor Swift",
  disambiguation: null,
  type: "person",
  country: "US",
  beginYear: 1989,
  endYear: null,
  matchedAlias: null,
  recordingCount: 120,
};

describe("useArtistSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useQueryWithParseMock.mockReturnValue({ data: [swift], isFetching: false, isError: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays disabled below two characters", () => {
    const { result } = renderHook(() => useArtistSearch(getBackendBaseUrl, "t"));

    expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
    expect(result.current.artists).toEqual([]);
    expect(result.current.settled).toBe(false);
  });

  it("waits for the debounce before querying, then fetches the trimmed query anonymously", () => {
    const { result } = renderHook(() => useArtistSearch(getBackendBaseUrl, " taylor "));

    expect(useQueryWithParseMock.mock.calls.at(-1)?.[0].enabled).toBe(false);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    const { queryKey, enabled, queryFn, schema } = useQueryWithParseMock.mock.calls.at(-1)?.[0];
    expect(queryKey).toEqual(["artistSearch", "taylor"]);
    expect(enabled).toBe(true);
    expect(schema).toBe(ArtistSearchResultsSchema);
    queryFn();
    expect(fetchMock).toHaveBeenCalledWith("artists/search/", true, false, {}, { q: "taylor", limit: 8 });
    expect(result.current.artists).toEqual([swift]);
    expect(result.current.settled).toBe(true);
  });

  it("keeps the previous results while the next query loads, and clears them below two characters", () => {
    const { result, rerender } = renderHook(({ text }) => useArtistSearch(getBackendBaseUrl, text), {
      initialProps: { text: "taylor" },
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    useQueryWithParseMock.mockReturnValue({ data: [swift], isFetching: true, isError: false });

    rerender({ text: "taylor s" });

    expect(useQueryWithParseMock.mock.calls.at(-1)?.[0].placeholderData).toBe(keepPreviousData);
    expect(result.current.artists).toEqual([swift]);
    expect(result.current.settled).toBe(false);

    rerender({ text: "t" });

    expect(result.current.artists).toEqual([]);
  });

  it("reports errors and is not settled while fetching", () => {
    useQueryWithParseMock.mockReturnValue({ data: undefined, isFetching: true, isError: true });
    const { result } = renderHook(() => useArtistSearch(getBackendBaseUrl, "taylor"));
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.settled).toBe(false);
    expect(result.current.artists).toEqual([]);
  });
});
