import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const { useTrackListMock } = vi.hoisted(() => ({ useTrackListMock: vi.fn() }));

vi.mock("@behindthemusictree/app-kit/genre-tree", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTrackList: useTrackListMock,
}));

import { TrackListOriginType, type CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";
import { useGenrePlaylistPlayback } from "./useGenrePlaylistPlayback";

const jazz = { uuid: "gp1", criteria: { uuid: "c1" } } as unknown as CriteriaPlaylistSimple;
const genreless = { uuid: "gp2", criteria: null } as unknown as CriteriaPlaylistSimple;
const artist = { uuid: "a1", name: "Band" };

describe("useGenrePlaylistPlayback", () => {
  const playNewTrackListFromGenrePlaylist = vi.fn().mockResolvedValue(undefined);
  const playNewTrackListFromArtist = vi.fn().mockResolvedValue(undefined);
  const setOrigin = (origin: unknown) =>
    useTrackListMock.mockReturnValue({
      trackList: origin ? { origin } : null,
      playNewTrackListFromGenrePlaylist,
      playNewTrackListFromArtist,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    setOrigin(null);
  });

  it("plays the whole genre playlist without an artist and tracks it as the playing node", async () => {
    setOrigin({ type: TrackListOriginType.GENRE_PLAYLIST, uuid: "gp1" });
    const { result } = renderHook(() => useGenrePlaylistPlayback({ scope: "reference", genrePlaylists: [jazz] }));

    expect(result.current.playingNodeId).toBe("gp1");
    await result.current.play(jazz);
    expect(playNewTrackListFromGenrePlaylist).toHaveBeenCalledWith(jazz, "reference");
  });

  it("has no playing node when nothing or another origin plays", () => {
    const { result, rerender } = renderHook(() =>
      useGenrePlaylistPlayback({ scope: "reference", genrePlaylists: [jazz] }),
    );
    expect(result.current.playingNodeId).toBeNull();

    setOrigin({ type: TrackListOriginType.ARTIST, uuid: "a1" });
    rerender();
    expect(result.current.playingNodeId).toBeNull();
  });

  it("plays only the artist's songs in the genre and maps the origin genre to its node", async () => {
    setOrigin({ type: TrackListOriginType.ARTIST, uuid: "a1", genreUuid: "c1" });
    const { result } = renderHook(() =>
      useGenrePlaylistPlayback({ scope: "reference", genrePlaylists: [jazz], artist }),
    );

    expect(result.current.playingNodeId).toBe("gp1");
    await result.current.play(jazz);
    expect(playNewTrackListFromArtist).toHaveBeenCalledWith(artist, "reference", {
      ordering: "title",
      genreUuid: "c1",
    });
  });

  it("ignores other artists, genre-less origins and genre-less nodes in artist mode", async () => {
    setOrigin({ type: TrackListOriginType.ARTIST, uuid: "other", genreUuid: "c1" });
    const { result, rerender } = renderHook(() =>
      useGenrePlaylistPlayback({ scope: "reference", genrePlaylists: [jazz, genreless], artist }),
    );
    expect(result.current.playingNodeId).toBeNull();

    setOrigin({ type: TrackListOriginType.ARTIST, uuid: "a1" });
    rerender();
    expect(result.current.playingNodeId).toBeNull();

    await result.current.play(genreless);
    expect(playNewTrackListFromArtist).not.toHaveBeenCalled();
  });
});
