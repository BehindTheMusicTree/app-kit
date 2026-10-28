import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "../../test-utils";

const {
  genreTreeWheelRadialPopCorePropsMock,
  genreTreeOutlinePropsMock,
  usePlayerMock,
  useTrackListMock,
  playGenreMock,
} = vi.hoisted(() => ({
  genreTreeWheelRadialPopCorePropsMock: vi.fn(),
  genreTreeOutlinePropsMock: vi.fn(),
  usePlayerMock: vi.fn(),
  useTrackListMock: vi.fn(),
  playGenreMock: vi.fn(),
}));

vi.mock("@behindthemusictree/genre-tree-view", () => ({
  GenreTreeWheelRadialPopCore: (props: unknown) => {
    genreTreeWheelRadialPopCorePropsMock(props);
    return null;
  },
  GenreTreeOutline: (props: unknown) => {
    genreTreeOutlinePropsMock(props);
    return null;
  },
}));

vi.mock("@behindthemusictree/app-kit/genre-tree", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTrackList: () => useTrackListMock(),
}));

vi.mock("@behindthemusictree/app-kit/player", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePlayer: () => usePlayerMock(),
}));

import GenrePlaylistTreeWheelRadialPopCore, {
  type GenreFocusProps,
  type GenrePlaylistTreeWheelRadialPopCoreProps,
} from "./TreeWheelRadialPopCore";
import type { CriteriaPlaylistSimple, TrackBase } from "@behindthemusictree/app-kit/genre-tree";
import { makeGenrePlaylistUuid, makeGenreUuid } from "@behindthemusictree/app-kit/genre-tree/testing";

function makeGenrePlaylist(overrides: Record<string, unknown> = {}) {
  return {
    uuid: makeGenrePlaylistUuid("gp1"),
    name: "Jazz",
    parent: null,
    root: { uuid: makeGenrePlaylistUuid("root1"), name: "Root" },
    tracksCount: 3,
    criteria: { uuid: makeGenreUuid("c1"), name: "Jazz" },
    createdOn: "2024-01-01T00:00:00.000Z",
    updatedOn: null,
    isUnacceptedRoot: false,
    ...overrides,
  } as CriteriaPlaylistSimple;
}

function renderWheelRadialPopCore(
  overrides: Partial<Omit<GenrePlaylistTreeWheelRadialPopCoreProps<TrackBase>, keyof GenreFocusProps>> &
    GenreFocusProps = {},
) {
  const props: GenrePlaylistTreeWheelRadialPopCoreProps<TrackBase> = {
    scope: "me",
    genrePlaylists: [
      makeGenrePlaylist(),
    ] as GenrePlaylistTreeWheelRadialPopCoreProps<TrackBase>["genrePlaylists"],
    handleGenreCreationAction: vi.fn(),
    handleGenreRenameAction: vi.fn(),
    ...overrides,
  };
  render(<GenrePlaylistTreeWheelRadialPopCore {...props} />);
  return props;
}

describe("GenrePlaylistTreeWheelRadialPopCore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerMock.mockReturnValue({ isPlaying: false, setIsPlaying: vi.fn() });
    useTrackListMock.mockReturnValue({ trackList: null, playNewTrackListFromGenrePlaylist: playGenreMock });
    playGenreMock.mockResolvedValue(undefined);
  });

  describe("outline", () => {
    it("renders GenreTreeWheelRadialPopCore, not GenreTreeOutline, by default", () => {
      renderWheelRadialPopCore();

      expect(genreTreeWheelRadialPopCorePropsMock).toHaveBeenCalled();
      expect(genreTreeOutlinePropsMock).not.toHaveBeenCalled();
    });

    it("renders GenreTreeOutline instead of GenreTreeWheelRadialPopCore when outline is true", () => {
      renderWheelRadialPopCore({ outline: true, allowWheelRotation: false });

      expect(genreTreeOutlinePropsMock).toHaveBeenCalled();
      expect(genreTreeWheelRadialPopCorePropsMock).not.toHaveBeenCalled();
      // GenreTreeOutline has no allowWheelRotation prop — it must not leak through.
      expect(genreTreeOutlinePropsMock.mock.calls[0][0]).not.toHaveProperty(
        "allowWheelRotation",
      );
    });

    it("passes defaultViewport and onViewportChange to the wheel but not to GenreTreeOutline", () => {
      const viewport = { x: 10, y: 20, zoom: 1.5 };
      const onViewportChange = vi.fn();
      renderWheelRadialPopCore({ defaultViewport: viewport, onViewportChange });
      const props = genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0];
      expect(props.defaultViewport).toBe(viewport);
      expect(props.onViewportChange).toBe(onViewportChange);

      renderWheelRadialPopCore({ outline: true, defaultViewport: viewport, onViewportChange });
      expect(genreTreeOutlinePropsMock.mock.calls[0][0]).not.toHaveProperty("defaultViewport");
    });

    it("passes controlsOrientation to the wheel but not to GenreTreeOutline", () => {
      renderWheelRadialPopCore({ controlsOrientation: "horizontal" });
      expect(genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].controlsOrientation).toBe("horizontal");

      renderWheelRadialPopCore({ outline: true, controlsOrientation: "horizontal" });
      expect(genreTreeOutlinePropsMock.mock.calls[0][0]).not.toHaveProperty("controlsOrientation");
    });

    it("forwards focus props to the wheel as focusNodeId/onFocusChange but not to GenreTreeOutline", () => {
      const onFocusGenreChange = vi.fn();
      renderWheelRadialPopCore({ focusGenreUuid: makeGenrePlaylistUuid("gp1"), onFocusGenreChange });
      const wheelProps = genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0];
      expect(wheelProps.focusNodeId).toBe(makeGenrePlaylistUuid("gp1"));
      expect(wheelProps.onFocusChange).toBe(onFocusGenreChange);

      renderWheelRadialPopCore({ outline: true, focusGenreUuid: makeGenrePlaylistUuid("gp1"), onFocusGenreChange });
      const outlineProps = genreTreeOutlinePropsMock.mock.calls[0][0];
      expect(outlineProps).not.toHaveProperty("focusNodeId");
      expect(outlineProps).not.toHaveProperty("onFocusChange");
    });
  });

  it("maps genre playlists to tree nodes including side, detaching criteria-less ones", () => {
    renderWheelRadialPopCore({
      genrePlaylists: [
        makeGenrePlaylist({
          uuid: makeGenrePlaylistUuid("gp1"),
          parent: { uuid: makeGenrePlaylistUuid("root") },
          name: "Jazz",
          tracksCount: 3,
          criteria: { uuid: makeGenreUuid("c1"), name: "Jazz", side: "pop", wikidataId: "Q8341" },
        }),
        makeGenrePlaylist({ uuid: makeGenrePlaylistUuid("gp2"), parent: null, name: "Rock", tracksCount: 0, criteria: null }),
      ],
    });

    const { nodes } = genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0];
    expect(nodes).toEqual([
      { id: makeGenrePlaylistUuid("gp1"), parentId: makeGenrePlaylistUuid("root"), name: "Jazz", itemCount: 3, actionable: true, detached: false, side: "pop", wikidataId: "Q8341" },
      { id: makeGenrePlaylistUuid("gp2"), parentId: null, name: "Rock", itemCount: 0, actionable: false, detached: true, side: undefined, wikidataId: null },
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
      trackList: { origin: { type: "GENRE_PLAYLIST", uuid: makeGenrePlaylistUuid("gp1") } },
      playNewTrackListFromGenrePlaylist: vi.fn(),
    });
    renderWheelRadialPopCore();
    expect(genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].playingNodeId).toBe(makeGenrePlaylistUuid("gp1"));
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
      expect(playGenreMock).not.toHaveBeenCalled();
    });

    it("toggles isPlaying when the playlist is already the current track list", () => {
      const setIsPlaying = vi.fn();
      usePlayerMock.mockReturnValue({ isPlaying: false, setIsPlaying });
      useTrackListMock.mockReturnValue({
        trackList: { origin: { type: "GENRE_PLAYLIST", uuid: makeGenrePlaylistUuid("gp1") } },
        playNewTrackListFromGenrePlaylist: vi.fn(),
      });
      renderWheelRadialPopCore();

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onPlayPause(makeGenrePlaylistUuid("gp1"));

      expect(setIsPlaying).toHaveBeenCalledWith(true);
      expect(playGenreMock).not.toHaveBeenCalled();
    });

    it("does nothing when the playlist has no tracks", () => {
      renderWheelRadialPopCore({ genrePlaylists: [makeGenrePlaylist({ tracksCount: 0 })] });

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onPlayPause(makeGenrePlaylistUuid("gp1"));

      expect(playGenreMock).not.toHaveBeenCalled();
    });

    it("plays the node's genre playlist", () => {
      renderWheelRadialPopCore();

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onPlayPause(makeGenrePlaylistUuid("gp1"));

      expect(playGenreMock).toHaveBeenCalledWith(expect.objectContaining({ uuid: makeGenrePlaylistUuid("gp1") }), "me");
    });

    it("logs an error when loading the tracks fails", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("boom");
      playGenreMock.mockRejectedValueOnce(error);
      renderWheelRadialPopCore();

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onPlayPause(makeGenrePlaylistUuid("gp1"));

      await vi.waitFor(() => expect(errorSpy).toHaveBeenCalledWith("Failed to load genre playlist tracks:", error));
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

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onAddChild(makeGenrePlaylistUuid("gp1"));
      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onAddChild("missing");

      expect(handleGenreCreationAction).not.toHaveBeenCalled();
    });

    it("calls handleGenreCreationAction with the playlist's criteria", () => {
      const handleGenreCreationAction = vi.fn();
      const criteria = { uuid: makeGenreUuid("c1"), name: "Jazz" };
      renderWheelRadialPopCore({ genrePlaylists: [makeGenrePlaylist({ criteria })], handleGenreCreationAction });

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onAddChild(makeGenrePlaylistUuid("gp1"));

      expect(handleGenreCreationAction).toHaveBeenCalledWith(criteria);
    });
  });

  describe("onRenameRequest", () => {
    it("does nothing when the node's playlist has no criteria", () => {
      const handleGenreRenameAction = vi.fn();
      renderWheelRadialPopCore({ genrePlaylists: [makeGenrePlaylist({ criteria: null })], handleGenreRenameAction });

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onRenameRequest({ id: makeGenrePlaylistUuid("gp1"), name: "Jazz" });

      expect(handleGenreRenameAction).not.toHaveBeenCalled();
    });

    it("calls handleGenreRenameAction with the playlist's criteria", () => {
      const handleGenreRenameAction = vi.fn();
      const criteria = { uuid: makeGenreUuid("c1"), name: "Jazz" };
      renderWheelRadialPopCore({ genrePlaylists: [makeGenrePlaylist({ criteria })], handleGenreRenameAction });

      genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onRenameRequest({ id: makeGenrePlaylistUuid("gp1"), name: "Jazz" });

      expect(handleGenreRenameAction).toHaveBeenCalledWith(criteria);
    });
  });

  it("onDeleteRequest prompts for confirmation", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWheelRadialPopCore();

    genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0].onDeleteRequest({ id: makeGenrePlaylistUuid("gp1"), name: "Jazz" });

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete "Jazz"?');
    confirmSpy.mockRestore();
  });

  it("passes additionalActions through", () => {
    const additionalActions = vi.fn();
    renderWheelRadialPopCore({ additionalActions });

    const props = genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0];
    expect(props.additionalActions).toBe(additionalActions);
  });

  describe("readOnly", () => {
    it("omits create/rename/delete handlers when readOnly is true", () => {
      renderWheelRadialPopCore({ readOnly: true });

      const props = genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0];
      expect(props.onAddChild).toBeUndefined();
      expect(props.onRenameRequest).toBeUndefined();
      expect(props.onDeleteRequest).toBeUndefined();
    });

    it("keeps create/rename/delete handlers when readOnly is omitted", () => {
      renderWheelRadialPopCore();

      const props = genreTreeWheelRadialPopCorePropsMock.mock.calls[0][0];
      expect(props.onAddChild).toBeInstanceOf(Function);
      expect(props.onRenameRequest).toBeInstanceOf(Function);
      expect(props.onDeleteRequest).toBeInstanceOf(Function);
    });
  });
});
