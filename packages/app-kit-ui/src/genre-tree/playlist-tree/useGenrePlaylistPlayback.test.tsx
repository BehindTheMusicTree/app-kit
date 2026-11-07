import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const { useTrackListMock } = vi.hoisted(() => ({ useTrackListMock: vi.fn() }));

vi.mock("@behindthemusictree/app-kit/genre-tree", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTrackList: useTrackListMock,
}));

import { TrackListOriginType, type CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";
import { useGenrePlaylistPlayback } from "./useGenrePlaylistPlayback";

const jazz = { uuid: "3f0d7b1e-8a3c-4d57-9a53-2b7f4f9c0a11", name: "Jazz", criteria: { uuid: "c1" }, genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { canonical: 139, regional: 0, all: 139 } } as unknown as CriteriaPlaylistSimple;
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
    setOrigin({ type: TrackListOriginType.GENRE_PLAYLIST, scope: "reference", uuid: jazz.uuid });
    const { result } = renderHook(() => useGenrePlaylistPlayback({ scope: "reference", genrePlaylists: [jazz] }));

    expect(result.current.playingNodeId).toBe(jazz.uuid);
    await result.current.play(jazz);
    expect(playNewTrackListFromGenrePlaylist).toHaveBeenCalledWith(jazz, "reference", { selection: { coverage: "genreAndSubgenres", subgenres: "canonical" } });
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
    setOrigin({ type: TrackListOriginType.GENRE_PLAYLIST, scope: "reference", uuid: jazz.uuid, artistUuid: "a1" });
    const { result } = renderHook(() =>
      useGenrePlaylistPlayback({ scope: "reference", genrePlaylists: [jazz], artist }),
    );

    expect(result.current.playingNodeId).toBe(jazz.uuid);
    await result.current.play(jazz);
    expect(playNewTrackListFromGenrePlaylist).toHaveBeenCalledWith(jazz, "reference", {
      artistUuid: "a1",
      selection: { coverage: "genreAndSubgenres", subgenres: "canonical" },
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
    expect(playNewTrackListFromGenrePlaylist).not.toHaveBeenCalled();
  });
  it("does not treat another scope or coverage as the current node", () => {
    const { result, rerender } = renderHook(() =>
      useGenrePlaylistPlayback({ scope: "reference", genrePlaylists: [jazz] }),
    );
    setOrigin({ type: TrackListOriginType.GENRE_PLAYLIST, scope: "me", uuid: jazz.uuid });
    rerender();
    expect(result.current.playingNodeId).toBeNull();
    setOrigin({ type: TrackListOriginType.GENRE_PLAYLIST, scope: "reference", uuid: jazz.uuid, selection: { coverage: "genreOnly" } });
    rerender();
    expect(result.current.playingNodeId).toBeNull();
  });

  it("keeps genreless and personal playback free of reference selection parameters", async () => {
    const { result, rerender } = renderHook(({ scope }: { scope: "reference" | "me" }) =>
      useGenrePlaylistPlayback({ scope, genrePlaylists: [genreless] }),
      { initialProps: { scope: "reference" } },
    );
    await result.current.play(genreless);
    expect(playNewTrackListFromGenrePlaylist).toHaveBeenLastCalledWith(genreless, "reference");
    rerender({ scope: "me" });
    await result.current.play(jazz);
    expect(playNewTrackListFromGenrePlaylist).toHaveBeenLastCalledWith(jazz, "me");
  });

});
