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

import { useSong } from "./useSong";
import { SongDetailedSchema } from "./schemas/song/detailed";
import { BackendError } from "../transport/app-errors/app-error";
import { ErrorCode } from "../transport/app-errors/app-error-codes";

const getBackendBaseUrl = () => "https://backend.example.com";
const uuid = "3f0d7b1e-8a3c-4d57-9a53-2b7f4f9c0a11";
const song = { uuid, title: "Creep" };
const notFound = new BackendError(ErrorCode.BACKEND_NOT_FOUND);

describe("useSong", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueryWithParseMock.mockReturnValue({ data: undefined, isPending: true, error: null });
  });

  it("is idle without a uuid", () => {
    const { result } = renderHook(() => useSong(null, getBackendBaseUrl));

    expect(result.current).toEqual({ status: "idle" });
    expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
  });

  it("treats a malformed uuid as not found without fetching", () => {
    const { result } = renderHook(() => useSong("not-a-uuid", getBackendBaseUrl));

    expect(result.current).toEqual({ status: "not-found" });
    expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
  });

  it("fetches the song detail with the detailed schema, without raising connectivity errors", async () => {
    renderHook(() => useSong(uuid, getBackendBaseUrl));
    const options = useQueryWithParseMock.mock.calls[0][0];

    expect(options.queryKey).toEqual(["referenceSongs", "detail", uuid]);
    expect(options.schema).toBe(SongDetailedSchema);
    expect(options.enabled).toBe(true);
    const signal = new AbortController().signal;
    await options.queryFn({ signal });
    expect(fetchMock).toHaveBeenCalledWith(`library/songs/${uuid}/`, true, false, { signal });
  });

  it("reports loading, then success", () => {
    const { result, rerender } = renderHook(() => useSong(uuid, getBackendBaseUrl));
    expect(result.current).toEqual({ status: "loading" });

    useQueryWithParseMock.mockReturnValue({ data: song, isPending: false, error: null });
    rerender();
    expect(result.current).toEqual({ status: "success", song });
  });

  it("maps a 404 to not found and never retries it", () => {
    useQueryWithParseMock.mockReturnValue({ data: undefined, isPending: false, error: notFound });
    const { result } = renderHook(() => useSong(uuid, getBackendBaseUrl));

    expect(result.current).toEqual({ status: "not-found" });
    expect(useQueryWithParseMock.mock.calls[0][0].retry(0, notFound)).toBe(false);
  });

  it("reports other failures as errors, retried up to three times", () => {
    const failure = new Error("boom");
    useQueryWithParseMock.mockReturnValue({ data: undefined, isPending: false, error: failure });
    const { result } = renderHook(() => useSong(uuid, getBackendBaseUrl));
    const { retry } = useQueryWithParseMock.mock.calls[0][0];

    expect(result.current).toEqual({ status: "error" });
    expect(retry(2, failure)).toBe(true);
    expect(retry(3, failure)).toBe(false);
  });
});
