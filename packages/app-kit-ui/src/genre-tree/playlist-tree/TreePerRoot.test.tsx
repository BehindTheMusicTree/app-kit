import { render } from "../../test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";

import GenrePlaylistTreePerRoot from "./TreePerRoot";
import { TrackListOriginType } from "@behindthemusictree/app-kit/genre-tree";
import { ErrorCode } from "@behindthemusictree/app-kit/transport";
import type { CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";
import { makeGenrePlaylistUuid, makeGenreUuid } from "@behindthemusictree/app-kit/genre-tree/testing";
import type { GenreTreeProps } from "@behindthemusictree/genre-tree-view";

const {
  setIsPlaying,
  playNewTrackListFromGenrePlaylist,
  handleGenreCreationAction,
  handleGenreRenameAction,
  showPopup,
} = vi.hoisted(() => ({
  setIsPlaying: vi.fn(),
  playNewTrackListFromGenrePlaylist: vi.fn(),
  handleGenreCreationAction: vi.fn(),
  handleGenreRenameAction: vi.fn(),
  showPopup: vi.fn(),
}));

vi.mock("../../popup/InternalErrorPopup", () => ({ default: () => null }));
vi.mock("@behindthemusictree/app-kit/popup", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePopup: () => ({ showPopup, hidePopup: vi.fn() }),
}));

// Mutated per-test to drive `usePlayer`/`useTrackList`'s mocked return values.
let isPlaying = false;
let trackList: { origin: { type: TrackListOriginType; uuid: string } } | null = null;

vi.mock("@behindthemusictree/app-kit/genre-tree", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTrackList: () => ({ trackList, playNewTrackListFromGenrePlaylist }),
}));

vi.mock("@behindthemusictree/app-kit/player", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePlayer: () => ({ isPlaying, setIsPlaying }),
}));

let capturedProps: GenreTreeProps | undefined;

vi.mock("@behindthemusictree/genre-tree-view", () => ({
  GenreTree: (props: GenreTreeProps) => {
    capturedProps = props;
    return null;
  },
  getGenreTreeColor: () => "#000000",
}));

// A genre-playlist's own uuid is a distinct entity from the genre (criteria) it wraps — see
// api/model/criteria/CriteriaManager.py, which creates the CriteriaPlaylist without passing the
// criteria's uuid. Tree nodes are keyed by the playlist uuid, so any handler that needs the
// underlying genre must resolve it via `.criteria`, not treat the node id as the genre id.
const criteriaUuid = makeGenreUuid("786837e1-99ff-4b1a-8298-22e4105b652b");
const playlistUuid = makeGenrePlaylistUuid("e85e092c-4b53-449f-8e94-e2fca43f2988");

const genrePlaylist: CriteriaPlaylistSimple = {
  uuid: playlistUuid,
  name: "Electronic",
  criteria: { uuid: criteriaUuid, name: "Electronic" },
  parent: null,
  root: { uuid: playlistUuid, name: "Electronic" },
  tracksCount: 3,
  createdOn: "2026-06-20T20:24:17.718222Z",
  updatedOn: "2026-06-20T20:24:17.718222Z",
  isUnacceptedRoot: false,
};

function renderTree(nodes: CriteriaPlaylistSimple[] = [genrePlaylist]) {
  render(
    <GenrePlaylistTreePerRoot
      scope="reference"
      rootUuid={playlistUuid}
      genrePlaylistTreePerRoot={nodes}
      handleGenreCreationAction={handleGenreCreationAction}
      handleGenreRenameAction={handleGenreRenameAction}
    />,
  );
}

describe("GenrePlaylistTreePerRoot", () => {
  beforeEach(() => {
    capturedProps = undefined;
    isPlaying = false;
    trackList = null;
    vi.clearAllMocks();
  });

  it("passes wheelZoom through to GenreTree", () => {
    render(
      <GenrePlaylistTreePerRoot
        scope="reference"
        rootUuid={playlistUuid}
        genrePlaylistTreePerRoot={[genrePlaylist]}
        handleGenreCreationAction={handleGenreCreationAction}
        handleGenreRenameAction={handleGenreRenameAction}
        wheelZoom="modifier"
      />,
    );

    expect(capturedProps!.wheelZoom).toBe("modifier");
  });

  it("passes controlsOrientation through to GenreTree", () => {
    render(
      <GenrePlaylistTreePerRoot
        scope="reference"
        rootUuid={playlistUuid}
        genrePlaylistTreePerRoot={[genrePlaylist]}
        handleGenreCreationAction={handleGenreCreationAction}
        handleGenreRenameAction={handleGenreRenameAction}
        controlsOrientation="horizontal"
      />,
    );

    expect(capturedProps!.controlsOrientation).toBe("horizontal");
  });

  describe("handlePlayPause", () => {
    it("toggles play state when the node is already the playing track list's origin", () => {
      trackList = { origin: { type: TrackListOriginType.GENRE_PLAYLIST, uuid: playlistUuid } };
      isPlaying = true;
      renderTree();

      capturedProps!.onPlayPause!(playlistUuid);

      expect(setIsPlaying).toHaveBeenCalledWith(false);
      expect(playNewTrackListFromGenrePlaylist).not.toHaveBeenCalled();
    });

    it("plays the genre playlist when it isn't already playing", () => {
      playNewTrackListFromGenrePlaylist.mockResolvedValue(undefined);
      renderTree();

      capturedProps!.onPlayPause!(playlistUuid);

      expect(playNewTrackListFromGenrePlaylist).toHaveBeenCalledWith(genrePlaylist, "reference");
    });

    it("logs an error and shows a popup when loading the tracks fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("network error");
      playNewTrackListFromGenrePlaylist.mockRejectedValueOnce(error);
      renderTree();

      capturedProps!.onPlayPause!(playlistUuid);

      await vi.waitFor(() =>
        expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load genre playlist tracks:", error),
      );
      expect(showPopup).toHaveBeenCalledWith(
        expect.objectContaining({ props: expect.objectContaining({ errorCode: ErrorCode.CLIENT_UNKNOWN }) }),
      );

      consoleErrorSpy.mockRestore();
    });

    it("does nothing for an empty genre playlist", () => {
      renderTree([{ ...genrePlaylist, tracksCount: 0 }]);

      capturedProps!.onPlayPause!(playlistUuid);

      expect(playNewTrackListFromGenrePlaylist).not.toHaveBeenCalled();
    });

    it("does nothing when the node has no matching genre-playlist", () => {
      renderTree();

      capturedProps!.onPlayPause!("unknown-node-id");

      expect(playNewTrackListFromGenrePlaylist).not.toHaveBeenCalled();
      expect(setIsPlaying).not.toHaveBeenCalled();
    });
  });

  describe("handleAddChild", () => {
    it("passes the genre's criteria to the creation handler", () => {
      renderTree();

      capturedProps!.onAddChild!(playlistUuid);

      expect(handleGenreCreationAction).toHaveBeenCalledWith(genrePlaylist.criteria);
    });

    it("does nothing when the genre-playlist has no criteria", () => {
      const criterialess = { ...genrePlaylist, criteria: null } as unknown as CriteriaPlaylistSimple;
      renderTree([criterialess]);

      capturedProps!.onAddChild!(playlistUuid);

      expect(handleGenreCreationAction).not.toHaveBeenCalled();
    });
  });

  describe("handleRenameRequest", () => {
    it("passes the genre's criteria to the rename handler", () => {
      renderTree();

      capturedProps!.onRenameRequest!({ id: playlistUuid, parentId: null, name: "Electronic", itemCount: 3, actionable: true });

      expect(handleGenreRenameAction).toHaveBeenCalledWith(genrePlaylist.criteria);
    });

    it("does nothing when the genre-playlist has no criteria", () => {
      const criterialess = { ...genrePlaylist, criteria: null } as unknown as CriteriaPlaylistSimple;
      renderTree([criterialess]);

      capturedProps!.onRenameRequest!({ id: playlistUuid, parentId: null, name: "Electronic", itemCount: 3, actionable: false });

      expect(handleGenreRenameAction).not.toHaveBeenCalled();
    });
  });

  describe("handleDeleteRequest", () => {
    it("prompts for confirmation and does nothing further when cancelled", () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
      renderTree();

      capturedProps!.onDeleteRequest!({ id: playlistUuid, parentId: null, name: "Electronic", itemCount: 3, actionable: true });

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete "Electronic"?');
      confirmSpy.mockRestore();
    });

    it("does not throw when the deletion is confirmed (deletion itself isn't implemented yet)", () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      renderTree();

      expect(() =>
        capturedProps!.onDeleteRequest!({ id: playlistUuid, parentId: null, name: "Electronic", itemCount: 3, actionable: true }),
      ).not.toThrow();

      confirmSpy.mockRestore();
    });
  });

  describe("readOnly", () => {
    it("omits create/rename/delete handlers when readOnly is true", () => {
      render(
        <GenrePlaylistTreePerRoot
          scope="reference"
          rootUuid={playlistUuid}
          genrePlaylistTreePerRoot={[genrePlaylist]}
          handleGenreCreationAction={handleGenreCreationAction}
          handleGenreRenameAction={handleGenreRenameAction}
          readOnly
        />,
      );

      expect(capturedProps!.onAddChild).toBeUndefined();
      expect(capturedProps!.onRenameRequest).toBeUndefined();
      expect(capturedProps!.onDeleteRequest).toBeUndefined();
    });

    it("keeps create/rename/delete handlers when readOnly is omitted", () => {
      renderTree();

      expect(capturedProps!.onAddChild).toBeInstanceOf(Function);
      expect(capturedProps!.onRenameRequest).toBeInstanceOf(Function);
      expect(capturedProps!.onDeleteRequest).toBeInstanceOf(Function);
    });
  });

});
