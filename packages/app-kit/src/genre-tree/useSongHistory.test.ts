import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

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

import { useSongHistory } from "./useSongHistory";
import { SongHistorySchema } from "./schemas/song-history";

const getBackendBaseUrl = () => "https://backend.example.com";
const uuid = "3f0d7b1e-8a3c-4d57-9a53-2b7f4f9c0a11";

describe("useSongHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueryWithParseMock.mockReturnValue({ data: undefined, isPending: true, error: null });
  });

  it("stays idle and disabled until enabled", () => {
    const { result } = renderHook(() => useSongHistory(uuid, getBackendBaseUrl, false));

    expect(result.current).toEqual({ status: "idle" });
    expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
  });

  it("fetches the history once enabled, forwarding the abort signal", async () => {
    const { result } = renderHook(() => useSongHistory(uuid, getBackendBaseUrl, true));
    const options = useQueryWithParseMock.mock.calls[0][0];
    const signal = new AbortController().signal;

    expect(result.current).toEqual({ status: "loading" });
    expect(options.queryKey).toEqual(["referenceSongs", "history", uuid]);
    expect(options.schema).toBe(SongHistorySchema);
    await options.queryFn({ signal });
    expect(fetchMock).toHaveBeenCalledWith(`library/songs/${uuid}/history/`, true, false, { signal });
  });

  it("reports entries on success and error on failure", () => {
    const entries = [{ uuid, action: "updated", actorPseudo: null, oldValue: null, newValue: "x", createdOn: "2026-01-01" }];
    useQueryWithParseMock.mockReturnValue({ data: entries, isPending: false, error: null });
    expect(renderHook(() => useSongHistory(uuid, getBackendBaseUrl, true)).result.current).toEqual({
      status: "success",
      entries,
    });

    useQueryWithParseMock.mockReturnValue({ data: undefined, isPending: false, error: new Error("boom") });
    expect(renderHook(() => useSongHistory(uuid, getBackendBaseUrl, true)).result.current).toEqual({ status: "error" });
  });
});
