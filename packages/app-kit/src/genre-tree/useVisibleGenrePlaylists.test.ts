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

describe("useVisibleGenrePlaylists artist projection", () => {
  const playlist = (uuid: string, parent: string | null) => ({
    uuid,
    name: uuid,
    parent: parent ? { uuid: parent } : null,
    root: { uuid: parent ?? uuid },
    criteria: { uuid: `c-${uuid}` },
    tracksCount: 9,
    genreOnlyTracksCount: 0,
    genreAndSubgenresTracksCount: { all: 9 },
    catalogue: { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { all: 9 } },
  });
  const tree = [playlist("rock", null), playlist("punk", "rock"), playlist("jazz", null)];
  const rockCount = {
    genrePlaylist: "rock",
    genreOnlyTracksCount: 2,
    genreAndSubgenresTracksCount: { all: 2 },
    catalogue: { genreOnlyTracksCount: 2, genreAndSubgenresTracksCount: { all: 2 } },
  };
  const artist = { ...options, artistUuid: "3f0d7b1e-8a3c-4d57-9a53-2b7f4f9c0a11" };

  beforeEach(() => {
    vi.clearAllMocks();
    useListFullGenrePlaylistsMock.mockReturnValue({ data: tree, isPending: false, isFetching: false, isError: false, refetch: vi.fn() });
  });

  it("serves the whole tree with the artist's counts and footprint", () => {
    useArtistGenreCountsMock.mockReturnValue({ data: [rockCount], isPending: false, isPlaceholderData: false });
    const { result } = renderHook(() => useVisibleGenrePlaylists(artist));

    expect(result.current.genrePlaylists.map((p) => [p.uuid, p.genreAndSubgenresTracksCount?.all])).toEqual([
      ["rock", 2],
      ["punk", 0],
      ["jazz", 0],
    ]);
    expect([...result.current.focusUuids!]).toEqual(["rock"]);
    expect(result.current.isFetching).toBe(false);
  });

  it("serves the plain tree without a footprint when the artist's counts fail", () => {
    useArtistGenreCountsMock.mockReturnValue({ data: undefined, isPending: false, isPlaceholderData: false, isError: true });
    const { result } = renderHook(() => useVisibleGenrePlaylists(artist));

    expect(result.current.genrePlaylists).toBe(tree);
    expect(result.current.focusUuids).toBeUndefined();
  });

  it("reports fetching while the artist's counts load", () => {
    useArtistGenreCountsMock.mockReturnValue({ data: undefined, isPending: true, isPlaceholderData: false });
    const { result } = renderHook(() => useVisibleGenrePlaylists(artist));

    expect(result.current.isFetching).toBe(true);
    expect(result.current.focusUuids).toBeUndefined();
  });

  it.each([[""], ["not-a-uuid"]])("serves the plain tree and never loads counts for the malformed artist %j", (artistUuid) => {
    useArtistGenreCountsMock.mockReturnValue({ data: [rockCount], isPending: true, isPlaceholderData: false });
    const { result } = renderHook(() => useVisibleGenrePlaylists({ ...options, artistUuid }));

    expect(useArtistGenreCountsMock).toHaveBeenCalledWith(null, options.getBackendBaseUrl);
    expect(result.current.genrePlaylists).toBe(tree);
    expect(result.current.focusUuids).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });

  it("ignores counts when no artist is open", () => {
    useArtistGenreCountsMock.mockReturnValue({ data: [rockCount], isPending: false, isPlaceholderData: false });
    const { result } = renderHook(() => useVisibleGenrePlaylists(options));

    expect(result.current.genrePlaylists).toBe(tree);
    expect(result.current.focusUuids).toBeUndefined();
  });
});
