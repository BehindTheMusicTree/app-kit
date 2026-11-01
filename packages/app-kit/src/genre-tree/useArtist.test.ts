import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

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

import { useArtist } from "./useArtist";
import { ArtistDetailedSchema } from "./schemas/artist-detailed";
import { AppError } from "../transport/app-errors/app-error";
import { ErrorCode } from "../transport/app-errors/app-error-codes";

const getBackendBaseUrl = () => "https://backend.example.com";
const uuid = "3f0d7b1e-8a3c-4d57-9a53-2b7f4f9c0a11";
const artist = { uuid, name: "Radiohead" };
const notFound = new AppError(ErrorCode.BACKEND_NOT_FOUND);

describe("useArtist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueryWithParseMock.mockReturnValue({ data: undefined, isPending: true, error: null });
  });

  it("is idle without a uuid", () => {
    const { result } = renderHook(() => useArtist(null, getBackendBaseUrl));

    expect(result.current).toEqual({ status: "idle" });
    expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
  });

  it("treats a malformed uuid as not found without fetching", () => {
    const { result } = renderHook(() => useArtist("not-a-uuid", getBackendBaseUrl));

    expect(result.current).toEqual({ status: "not-found" });
    expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
  });

  it("fetches the artist detail with the detailed schema, without raising connectivity errors", async () => {
    renderHook(() => useArtist(uuid, getBackendBaseUrl));
    const options = useQueryWithParseMock.mock.calls[0][0];

    expect(options.queryKey).toEqual(["artist", uuid]);
    expect(options.schema).toBe(ArtistDetailedSchema);
    expect(options.enabled).toBe(true);
    await options.queryFn();
    expect(fetchMock).toHaveBeenCalledWith(`artists/${uuid}/`, true, false, undefined, undefined, false, true);
  });

  it("reports loading, then success", () => {
    const { result, rerender } = renderHook(() => useArtist(uuid, getBackendBaseUrl));
    expect(result.current).toEqual({ status: "loading" });

    useQueryWithParseMock.mockReturnValue({ data: artist, isPending: false, error: null });
    rerender();
    expect(result.current).toEqual({ status: "success", artist });
  });

  it("maps a 404 to not found and never retries it", () => {
    useQueryWithParseMock.mockReturnValue({ data: undefined, isPending: false, error: notFound });
    const { result } = renderHook(() => useArtist(uuid, getBackendBaseUrl));

    expect(result.current).toEqual({ status: "not-found" });
    expect(useQueryWithParseMock.mock.calls[0][0].retry(0, notFound)).toBe(false);
  });

  it("reports other failures as errors, retried up to three times", () => {
    const failure = new Error("boom");
    useQueryWithParseMock.mockReturnValue({ data: undefined, isPending: false, error: failure });
    const { result } = renderHook(() => useArtist(uuid, getBackendBaseUrl));
    const { retry } = useQueryWithParseMock.mock.calls[0][0];

    expect(result.current).toEqual({ status: "error" });
    expect(retry(2, failure)).toBe(true);
    expect(retry(3, failure)).toBe(false);
  });
});
