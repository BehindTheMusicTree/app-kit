import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { z } from "zod";

const {
  genreTreeWheelPropsMock,
  usePlayerMock,
  useTrackListMock,
  updateGenreMutateMock,
  fetchGenrePlaylistDetailedMutateMock,
} = vi.hoisted(() => ({
  genreTreeWheelPropsMock: vi.fn(),
  usePlayerMock: vi.fn(),
  useTrackListMock: vi.fn(),
  updateGenreMutateMock: vi.fn(),
  fetchGenrePlaylistDetailedMutateMock: vi.fn(),
}));

vi.mock("@behindthemusictree/genre-tree-view", () => ({
  GenreTreeWheel: (props: unknown) => {
    genreTreeWheelPropsMock(props);
    return null;
  },
}));

vi.mock("../TrackListContext", () => ({
  useTrackList: () => useTrackListMock(),
}));

vi.mock("../useGenre", () => ({
  useUpdateGenre: () => ({ mutate: updateGenreMutateMock }),
}));

vi.mock("../useGenrePlaylist", () => ({
  useFetchGenrePlaylistDetailed: () => ({ mutate: fetchGenrePlaylistDetailedMutateMock }),
}));

vi.mock("../../player/PlayerContext", () => ({
  usePlayer: () => usePlayerMock(),
}));

import GenrePlaylistTreeWheel from "./TreeWheel";

const getBackendBaseUrl = () => "https://backend.example.com";
const schema = z.custom();

function makeGenrePlaylist(overrides: Record<string, unknown> = {}) {
  return {
    uuid: "gp1",
    name: "Jazz",
    parent: null,
    tracksCount: 3,
    criteria: { uuid: "c1", name: "Jazz" },
    ...overrides,
  };
}

function renderWheel(overrides: Record<string, unknown> = {}) {
  const props = {
    scope: "me" as const,
    genrePlaylists: [makeGenrePlaylist()],
    reparentingGenreUuid: null,
    setReparentingGenreUuid: vi.fn(),
    handleGenreCreationAction: vi.fn(),
    handleGenreRenameAction: vi.fn(),
    getBackendBaseUrl,
    criteriaPlaylistDetailedSchema: schema,
    ...overrides,
  };
  render(<GenrePlaylistTreeWheel {...(props as never)} />);
  return props;
}

describe("GenrePlaylistTreeWheel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerMock.mockReturnValue({ isPlaying: false, setIsPlaying: vi.fn() });
    useTrackListMock.mockReturnValue({ trackList: null, playNewTrackListFromGenrePlaylist: vi.fn() });
  });

  it("maps genre playlists to tree nodes", () => {
    renderWheel({
      genrePlaylists: [
        makeGenrePlaylist({ uuid: "gp1", parent: { uuid: "root" }, name: "Jazz", tracksCount: 3, criteria: {} }),
        makeGenrePlaylist({ uuid: "gp2", parent: null, name: "Rock", tracksCount: 0, criteria: null }),
      ],
    });

    const { nodes } = genreTreeWheelPropsMock.mock.calls[0][0];
    expect(nodes).toEqual([
      { id: "gp1", parentId: "root", name: "Jazz", itemCount: 3, actionable: true },
      { id: "gp2", parentId: null, name: "Rock", itemCount: 0, actionable: false },
    ]);
  });

  it("has no playing node when there is no track list", () => {
    renderWheel();
    expect(genreTreeWheelPropsMock.mock.calls[0][0].playingNodeId).toBeNull();
  });

  it("has no playing node when the track list origin is a single track", () => {
    useTrackListMock.mockReturnValue({
      trackList: { origin: { type: "TRACK", uuid: "t1" } },
      playNewTrackListFromGenrePlaylist: vi.fn(),
    });
    renderWheel();
    expect(genreTreeWheelPropsMock.mock.calls[0][0].playingNodeId).toBeNull();
  });

  it("reports the playing node id when the track list is a genre playlist", () => {
    useTrackListMock.mockReturnValue({
      trackList: { origin: { type: "GENRE_PLAYLIST", uuid: "gp1" } },
      playNewTrackListFromGenrePlaylist: vi.fn(),
    });
    renderWheel();
    expect(genreTreeWheelPropsMock.mock.calls[0][0].playingNodeId).toBe("gp1");
  });

  it("passes playState based on isPlaying", () => {
    usePlayerMock.mockReturnValue({ isPlaying: true, setIsPlaying: vi.fn() });
    renderWheel();
    expect(genreTreeWheelPropsMock.mock.calls[0][0].playState).toBe("playing");
  });

  describe("onPlayPause", () => {
    it("does nothing when the genre playlist is not found", () => {
      const setIsPlaying = vi.fn();
      usePlayerMock.mockReturnValue({ isPlaying: false, setIsPlaying });
      renderWheel();

      genreTreeWheelPropsMock.mock.calls[0][0].onPlayPause("missing");

      expect(setIsPlaying).not.toHaveBeenCalled();
      expect(fetchGenrePlaylistDetailedMutateMock).not.toHaveBeenCalled();
    });

    it("toggles isPlaying when the playlist is already the current track list", () => {
      const setIsPlaying = vi.fn();
      usePlayerMock.mockReturnValue({ isPlaying: false, setIsPlaying });
      useTrackListMock.mockReturnValue({
        trackList: { origin: { type: "GENRE_PLAYLIST", uuid: "gp1" } },
        playNewTrackListFromGenrePlaylist: vi.fn(),
      });
      renderWheel();

      genreTreeWheelPropsMock.mock.calls[0][0].onPlayPause("gp1");

      expect(setIsPlaying).toHaveBeenCalledWith(true);
      expect(fetchGenrePlaylistDetailedMutateMock).not.toHaveBeenCalled();
    });

    it("does nothing when the playlist has no tracks", () => {
      renderWheel({ genrePlaylists: [makeGenrePlaylist({ tracksCount: 0 })] });

      genreTreeWheelPropsMock.mock.calls[0][0].onPlayPause("gp1");

      expect(fetchGenrePlaylistDetailedMutateMock).not.toHaveBeenCalled();
    });

    it("fetches the detailed playlist and plays it on success", () => {
      const playNewTrackListFromGenrePlaylist = vi.fn();
      useTrackListMock.mockReturnValue({ trackList: null, playNewTrackListFromGenrePlaylist });
      renderWheel();

      genreTreeWheelPropsMock.mock.calls[0][0].onPlayPause("gp1");

      expect(fetchGenrePlaylistDetailedMutateMock).toHaveBeenCalledWith(
        "gp1",
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
      );

      const { onSuccess } = fetchGenrePlaylistDetailedMutateMock.mock.calls[0][1];
      const detailedPlaylist = { uuid: "gp1", name: "Jazz", trackPlaylistRelations: [] };
      onSuccess(detailedPlaylist);

      expect(playNewTrackListFromGenrePlaylist).toHaveBeenCalledWith(detailedPlaylist, "me");
    });

    it("logs an error via onError", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      renderWheel();

      genreTreeWheelPropsMock.mock.calls[0][0].onPlayPause("gp1");
      const { onError } = fetchGenrePlaylistDetailedMutateMock.mock.calls[0][1];
      onError(new Error("boom"));

      expect(errorSpy).toHaveBeenCalledWith("Failed to fetch detailed genre playlist:", expect.any(Error));
      errorSpy.mockRestore();
    });
  });

  describe("onAddChild", () => {
    it("does nothing when the playlist is missing or has no criteria", () => {
      const handleGenreCreationAction = vi.fn();
      renderWheel({
        genrePlaylists: [makeGenrePlaylist({ criteria: null })],
        handleGenreCreationAction,
      });

      genreTreeWheelPropsMock.mock.calls[0][0].onAddChild("gp1");
      genreTreeWheelPropsMock.mock.calls[0][0].onAddChild("missing");

      expect(handleGenreCreationAction).not.toHaveBeenCalled();
    });

    it("calls handleGenreCreationAction with the playlist's criteria", () => {
      const handleGenreCreationAction = vi.fn();
      const criteria = { uuid: "c1", name: "Jazz" };
      renderWheel({ genrePlaylists: [makeGenrePlaylist({ criteria })], handleGenreCreationAction });

      genreTreeWheelPropsMock.mock.calls[0][0].onAddChild("gp1");

      expect(handleGenreCreationAction).toHaveBeenCalledWith(criteria);
    });
  });

  describe("onRenameRequest", () => {
    it("does nothing when the node's playlist has no criteria", () => {
      const handleGenreRenameAction = vi.fn();
      renderWheel({ genrePlaylists: [makeGenrePlaylist({ criteria: null })], handleGenreRenameAction });

      genreTreeWheelPropsMock.mock.calls[0][0].onRenameRequest({ id: "gp1", name: "Jazz" });

      expect(handleGenreRenameAction).not.toHaveBeenCalled();
    });

    it("calls handleGenreRenameAction with the playlist's criteria", () => {
      const handleGenreRenameAction = vi.fn();
      const criteria = { uuid: "c1", name: "Jazz" };
      renderWheel({ genrePlaylists: [makeGenrePlaylist({ criteria })], handleGenreRenameAction });

      genreTreeWheelPropsMock.mock.calls[0][0].onRenameRequest({ id: "gp1", name: "Jazz" });

      expect(handleGenreRenameAction).toHaveBeenCalledWith(criteria);
    });
  });

  it("onDeleteRequest prompts for confirmation", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWheel();

    genreTreeWheelPropsMock.mock.calls[0][0].onDeleteRequest({ id: "gp1", name: "Jazz" });

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete "Jazz"?');
    confirmSpy.mockRestore();
  });

  it("onReparentRequest sets the reparenting genre uuid", () => {
    const setReparentingGenreUuid = vi.fn();
    renderWheel({ setReparentingGenreUuid });

    genreTreeWheelPropsMock.mock.calls[0][0].onReparentRequest({ id: "gp1", name: "Jazz" });

    expect(setReparentingGenreUuid).toHaveBeenCalledWith("gp1");
  });

  it("onReparent mutates the genre parent and clears reparenting state on success", () => {
    const setReparentingGenreUuid = vi.fn();
    renderWheel({ setReparentingGenreUuid });

    genreTreeWheelPropsMock.mock.calls[0][0].onReparent("gp1", "gp2");

    expect(updateGenreMutateMock).toHaveBeenCalledWith(
      { uuid: "gp1", data: { parent: "gp2" } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    const { onSuccess } = updateGenreMutateMock.mock.calls[0][1];
    onSuccess();

    expect(setReparentingGenreUuid).toHaveBeenCalledWith(null);
  });

  it("passes reparentingGenreUuid and additionalActions through", () => {
    const additionalActions = vi.fn();
    renderWheel({ reparentingGenreUuid: "gp1", additionalActions });

    const props = genreTreeWheelPropsMock.mock.calls[0][0];
    expect(props.reparentingNodeId).toBe("gp1");
    expect(props.additionalActions).toBe(additionalActions);
  });
});
