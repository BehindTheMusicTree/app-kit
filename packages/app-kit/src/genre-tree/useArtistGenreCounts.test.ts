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

import { useArtistGenreCounts } from "./useArtistGenreCounts";
import { AppError } from "../transport/app-errors/app-error";
import { ErrorCode } from "../transport/app-errors/app-error-codes";

const getBackendBaseUrl = () => "https://backend.example.com";
const uuid = "3f0d7b1e-8a3c-4d57-9a53-2b7f4f9c0a11";

describe("useArtistGenreCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueryWithParseMock.mockReturnValue({ data: undefined, isPending: true, error: null });
  });

  it("is disabled without an artist", () => {
    renderHook(() => useArtistGenreCounts(null, getBackendBaseUrl));

    expect(useQueryWithParseMock.mock.calls[0][0].enabled).toBe(false);
  });

  it("fetches the artist's genre counts under a base-url-scoped key", async () => {
    renderHook(() => useArtistGenreCounts(uuid, getBackendBaseUrl));
    const options = useQueryWithParseMock.mock.calls[0][0];

    expect(options.queryKey).toEqual(["artistGenreCounts", "https://backend.example.com", uuid]);
    expect(options.enabled).toBe(true);
    await options.queryFn();
    expect(fetchMock).toHaveBeenCalledWith(`artists/${uuid}/genre-counts/`, true, false, undefined, undefined, false, true);
  });

  it("parses the sparse camelCase payload", () => {
    renderHook(() => useArtistGenreCounts(uuid, getBackendBaseUrl));
    const { schema } = useQueryWithParseMock.mock.calls[0][0];
    const row = { genrePlaylist: "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d", songsCount: 3, tracksCount: 2 };

    expect(schema.parse([row])).toEqual([row]);
    expect(() => schema.parse([{ ...row, songsCount: -1 }])).toThrow();
  });

  it("never retries a 404", () => {
    renderHook(() => useArtistGenreCounts(uuid, getBackendBaseUrl));
    const { retry } = useQueryWithParseMock.mock.calls[0][0];

    expect(retry(0, new AppError(ErrorCode.BACKEND_NOT_FOUND))).toBe(false);
    expect(retry(0, new Error("boom"))).toBe(true);
    expect(retry(3, new Error("boom"))).toBe(false);
  });
});
