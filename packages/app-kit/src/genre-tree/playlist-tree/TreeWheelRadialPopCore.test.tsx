import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { z } from "zod";

const {
  genreTreeWheelRadialPopCorePropsMock,
  usePlayerMock,
  useTrackListMock,
  updateGenreMutateMock,
  fetchGenrePlaylistDetailedMutateMock,
} = vi.hoisted(() => ({
  genreTreeWheelRadialPopCorePropsMock: vi.fn(),
  usePlayerMock: vi.fn(),
  useTrackListMock: vi.fn(),
  updateGenreMutateMock: vi.fn(),
  fetchGenrePlaylistDetailedMutateMock: vi.fn(),
}));

vi.mock("@behindthemusictree/genre-tree-view", () => ({
  GenreTreeWheelRadialPopCore: (props: unknown) => {
    genreTreeWheelRadialPopCorePropsMock(props);
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

import GenrePlaylistTreeWheelRadialPopCore, {
  type GenrePlaylistTreeWheelRadialPopCoreProps,
} from "./TreeWheelRadialPopCore";
import type { TrackBase } from "../schemas/track/base";
import type { CriteriaPlaylistDetailedLike } from "../models/TrackListOrigin";

const getBackendBaseUrl = () => "https://backend.example.com";
const schema = z.custom<CriteriaPlaylistDetailedLike<TrackBase>>();

function makeGenrePlaylist(overrides: Record<string, unknown> = {}) {
  return {
    uuid: "gp1",
    name: "Jazz",
    parent: null,
    root: { uuid: "root1", name: "Root" },
    tracksCount: 3,
    criteria: { uuid: "c1", name: "Jazz" },
    createdOn: "2024-01-01T00:00:00.000Z",
    updatedOn: null,
    ...overrides,
  };
}

function renderWheelRadialPopCore(overrides: Partial<GenrePlaylistTreeWheelRadialPopCoreProps<TrackBase>> = {}) {
  const props: GenrePlaylistTreeWheelRadialPopCoreProps<TrackBase> = {
    scope: "me",
    genrePlaylists: [
      makeGenrePlaylist(),
    ] as GenrePlaylistTreeWheelRadialPopCoreProps<TrackBase>["genrePlaylists"],
    reparentingGenreUuid: null,
    setReparentingGenreUuid: vi.fn(),
    handleGenreCreationAction: vi.fn(),
    handleGenreRenameAction: vi.fn(),
    getBackendBaseUrl,
    criteriaPlaylistDetailedSchema: schema,
    ...overrides,
  };
  render(<GenrePlaylistTreeWheelRadialPopCore {...props} />);
  return props;
}

describe("GenrePlaylistTreeWheelRadialPopCore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerMock.mockReturnValue({ isPlaying: false, setIsPlaying: vi.fn() });
    useTrackListMock.mockReturnValue({ trackList: null, playNewTrackListFromGenrePlaylist: vi.fn() });
  });

  it("maps genre playlists to tree nodes including side", () => {
    renderWheelRadialPopCore({
      genrePlaylists: [
        makeGenrePlaylist({
          uuid: "gp1",
          parent: { uuid: "root" },
          name: "Jazz",
          tracksCount: 3,
          criteria: { uuid: "c1", name: "Jazz", side: "pop" },
        }),
        makeGenrePlaylist({ uuid: "gp2", parent: null, name: "Rock", tracksCount: 0, criteria: null }),
      ],
    });

    const { nodes } = genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0];
    expect(nodes).toEqual([
      { id: "gp1", parentId: "root", name: "Jazz", itemCount: 3, actionable: true, side: "pop" },
      { id: "gp2", parentId: null, name: "Rock", itemCount: 0, actionable: false, side: undefined },
    ]);
  });

  it("has no playing node when there is no track list", () => {
    renderWheelRadialPopCore();
    expect(genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].playingNodeId).toBeNull();
  });

  it("has no playing node when the track list origin is a single track", () => {
    useTrackListMock.mockReturnValue({
      trackList: { origin: { type: "TRACK", uuid: "t1" } },
      playNewTrackListFromGenrePlaylist: vi.fn(),
    });
    renderWheelRadialPopCore();
    expect(genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].playingNodeId).toBeNull();
  });

  it("reports the playing node id when the track list is a genre playlist", () => {
    useTrackListMock.mockReturnValue({
      trackList: { origin: { type: "GENRE_PLAYLIST", uuid: "gp1" } },
      playNewTrackListFromGenrePlaylist: vi.fn(),
    });
    renderWheelRadialPopCore();
    expect(genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].playingNodeId).toBe("gp1");
  });

  it("passes playState based on isPlaying", () => {
    usePlayerMock.mockReturnValue({ isPlaying: true, setIsPlaying: vi.fn() });
    renderWheelRadialPopCore();
    expect(genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].playState).toBe("playing");
  });

  describe("onPlayPause", () => {
    it("does nothing when the genre playlist is not found", () => {
      const setIsPlaying = vi.fn();
      usePlayerMock.mockReturnValue({ isPlaying: false, setIsPlaying });
      renderWheelRadialPopCore();

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onPlayPause("missing");

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
      renderWheelRadialPopCore();

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onPlayPause("gp1");

      expect(setIsPlaying).toHaveBeenCalledWith(true);
      expect(fetchGenrePlaylistDetailedMutateMock).not.toHaveBeenCalled();
    });

    it("does nothing when the playlist has no tracks", () => {
      renderWheelRadialPopCore({ genrePlaylists: [makeGenrePlaylist({ tracksCount: 0 })] });

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onPlayPause("gp1");

      expect(fetchGenrePlaylistDetailedMutateMock).not.toHaveBeenCalled();
    });

    it("fetches the detailed playlist and plays it on success", () => {
      const playNewTrackListFromGenrePlaylist = vi.fn();
      useTrackListMock.mockReturnValue({ trackList: null, playNewTrackListFromGenrePlaylist });
      renderWheelRadialPopCore();

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onPlayPause("gp1");

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
      renderWheelRadialPopCore();

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onPlayPause("gp1");
      const { onError } = fetchGenrePlaylistDetailedMutateMock.mock.calls[0][1];
      onError(new Error("boom"));

      expect(errorSpy).toHaveBeenCalledWith("Failed to fetch detailed genre playlist:", expect.any(Error));
      errorSpy.mockRestore();
    });
  });

  describe("onAddChild", () => {
    it("does nothing when the playlist is missing or has no criteria", () => {
      const handleGenreCreationAction = vi.fn();
      renderWheelRadialPopCore({
        genrePlaylists: [makeGenrePlaylist({ criteria: null })],
        handleGenreCreationAction,
      });

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onAddChild("gp1");
      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onAddChild("missing");

      expect(handleGenreCreationAction).not.toHaveBeenCalled();
    });

    it("calls handleGenreCreationAction with the playlist's criteria", () => {
      const handleGenreCreationAction = vi.fn();
      const criteria = { uuid: "c1", name: "Jazz" };
      renderWheelRadialPopCore({ genrePlaylists: [makeGenrePlaylist({ criteria })], handleGenreCreationAction });

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onAddChild("gp1");

      expect(handleGenreCreationAction).toHaveBeenCalledWith(criteria);
    });
  });

  describe("onRenameRequest", () => {
    it("does nothing when the node's playlist has no criteria", () => {
      const handleGenreRenameAction = vi.fn();
      renderWheelRadialPopCore({ genrePlaylists: [makeGenrePlaylist({ criteria: null })], handleGenreRenameAction });

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onRenameRequest({ id: "gp1", name: "Jazz" });

      expect(handleGenreRenameAction).not.toHaveBeenCalled();
    });

    it("calls handleGenreRenameAction with the playlist's criteria", () => {
      const handleGenreRenameAction = vi.fn();
      const criteria = { uuid: "c1", name: "Jazz" };
      renderWheelRadialPopCore({ genrePlaylists: [makeGenrePlaylist({ criteria })], handleGenreRenameAction });

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onRenameRequest({ id: "gp1", name: "Jazz" });

      expect(handleGenreRenameAction).toHaveBeenCalledWith(criteria);
    });
  });

  it("onDeleteRequest prompts for confirmation", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWheelRadialPopCore();

    genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onDeleteRequest({ id: "gp1", name: "Jazz" });

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete "Jazz"?');
    confirmSpy.mockRestore();
  });

  it("onReparentRequest sets the reparenting genre uuid", () => {
    const setReparentingGenreUuid = vi.fn();
    renderWheelRadialPopCore({ setReparentingGenreUuid });

    genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onReparentRequest({ id: "gp1", name: "Jazz" });

    expect(setReparentingGenreUuid).toHaveBeenCalledWith("gp1");
  });

  it("onReparent mutates the genre parent and clears reparenting state on success", () => {
    const setReparentingGenreUuid = vi.fn();
    renderWheelRadialPopCore({ setReparentingGenreUuid });

    genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onReparent("gp1", "gp2");

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
    renderWheelRadialPopCore({ reparentingGenreUuid: "gp1", additionalActions });

    const props = genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0];
    expect(props.reparentingNodeId).toBe("gp1");
    expect(props.additionalActions).toBe(additionalActions);
  });

  describe("readOnly", () => {
    it("omits create/rename/reparent handlers but keeps delete when readOnly is true", () => {
      renderWheelRadialPopCore({ readOnly: true });

      const props = genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0];
      expect(props.onAddChild).toBeUndefined();
      expect(props.onRenameRequest).toBeUndefined();
      expect(props.onReparentRequest).toBeUndefined();
      expect(props.onReparent).toBeUndefined();
      expect(props.onDeleteRequest).toBeInstanceOf(Function);
    });

    it("keeps create/rename/reparent handlers when readOnly is omitted", () => {
      renderWheelRadialPopCore();

      const props = genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0];
      expect(props.onAddChild).toBeInstanceOf(Function);
      expect(props.onRenameRequest).toBeInstanceOf(Function);
      expect(props.onReparentRequest).toBeInstanceOf(Function);
      expect(props.onReparent).toBeInstanceOf(Function);
    });
  });
});
