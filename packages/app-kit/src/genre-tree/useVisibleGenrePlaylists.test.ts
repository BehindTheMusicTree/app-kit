import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { useListFullGenrePlaylistsMock, useArtistGenreCountsMock } = vi.hoisted(() => ({
  useListFullGenrePlaylistsMock: vi.fn(),
  useArtistGenreCountsMock: vi.fn(),
}));

vi.mock("./useGenrePlaylist", () => ({
  useListFullGenrePlaylists: (...args: unknown[]) => useListFullGenrePlaylistsMock(...args),
}));
vi.mock("./useArtistGenreCounts", () => ({
  useArtistGenreCounts: (...args: unknown[]) => useArtistGenreCountsMock(...args),
}));

import { useVisibleGenrePlaylists } from "./useVisibleGenrePlaylists";

const options = { scope: "reference" as never, getBackendBaseUrl: () => "https://b.example.com" };

describe("useVisibleGenrePlaylists errors", () => {
  const refetch = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    useArtistGenreCountsMock.mockReturnValue({ data: undefined, isPending: false, isPlaceholderData: false });
  });

  it("reports isError and exposes refetch when the tree failed with nothing cached", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({ data: undefined, isPending: false, isFetching: false, isError: true, refetch });
    const { result } = renderHook(() => useVisibleGenrePlaylists(options));

    expect(result.current.isError).toBe(true);
    expect(result.current.genrePlaylists).toEqual([]);
    expect(result.current.refetch).toBe(refetch);
  });

  it("does not report an error while a cached tree is still served", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({ data: [{ uuid: "gp" }], isPending: false, isFetching: false, isError: true, refetch });
    const { result } = renderHook(() => useVisibleGenrePlaylists(options));

    expect(result.current.isError).toBe(false);
    expect(result.current.genrePlaylists).toHaveLength(1);
  });
});
