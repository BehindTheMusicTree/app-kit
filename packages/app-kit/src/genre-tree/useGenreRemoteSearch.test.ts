import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

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

import { useGenreRemoteSearch } from "./useGenreRemoteSearch";
import { GenreSearchResultsSchema } from "./schemas/genre-search";

const getBackendBaseUrl = () => "https://backend.example.com";

describe("useGenreRemoteSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useQueryWithParseMock.mockReturnValue({ data: [], isFetching: false, isError: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays disabled below two characters", () => {
    const { result } = renderHook(() => useGenreRemoteSearch(getBackendBaseUrl, "b"));

    expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
    expect(result.current.pending).toBe(false);
  });

  it("queries genres/search/ with the debounced trimmed query and tree filter", () => {
    renderHook(() => useGenreRemoteSearch(getBackendBaseUrl, " bossa ", { treeName: "canonical", limit: 20 }));
    act(() => {
      vi.advanceTimersByTime(250);
    });

    const { queryKey, enabled, queryFn, schema } = useQueryWithParseMock.mock.calls.at(-1)?.[0];
    expect(queryKey).toEqual(["genreSearch", { q: "bossa", limit: 20, treeName: "canonical" }]);
    expect(enabled).toBe(true);
    expect(schema).toBe(GenreSearchResultsSchema);
    const signal = new AbortController().signal;
    queryFn({ signal });
    expect(fetchMock).toHaveBeenCalledWith("genres/search/", true, false, { signal }, { q: "bossa", limit: 20, treeName: "canonical" });
  });

  it("omits treeName when not given and honours the enabled gate", () => {
    renderHook(() => useGenreRemoteSearch(getBackendBaseUrl, "bossa", { enabled: false }));
    act(() => {
      vi.advanceTimersByTime(250);
    });

    const { queryKey, enabled } = useQueryWithParseMock.mock.calls.at(-1)?.[0];
    expect(queryKey).toEqual(["genreSearch", { q: "bossa", limit: 8 }]);
    expect(enabled).toBe(false);
  });
});
