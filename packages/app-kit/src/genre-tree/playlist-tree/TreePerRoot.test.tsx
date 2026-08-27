import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

import GenrePlaylistTreePerRoot from "./TreePerRoot";
import { TrackListOriginType } from "../models/TrackListOriginType";
import { ErrorCode } from "../../transport/app-errors/app-error-codes";
import type { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";
import type { GenreTreeProps } from "@behindthemusictree/genre-tree-view";

const {
  setIsPlaying,
  playNewTrackListFromGenrePlaylist,
  updateGenreMutate,
  fetchGenrePlaylistDetailed,
  handleGenreCreationAction,
  handleGenreRenameAction,
  showPopup,
} = vi.hoisted(() => ({
  setIsPlaying: vi.fn(),
  playNewTrackListFromGenrePlaylist: vi.fn(),
  updateGenreMutate: vi.fn(),
  fetchGenrePlaylistDetailed: vi.fn(),
  handleGenreCreationAction: vi.fn(),
  handleGenreRenameAction: vi.fn(),
  showPopup: vi.fn(),
}));

vi.mock("../../popup", () => ({
  usePopup: () => ({ showPopup, hidePopup: vi.fn() }),
  InternalErrorPopup: () => null,
}));

// Mutated per-test to drive `usePlayer`/`useTrackList`'s mocked return values.
let isPlaying = false;
let trackList: { origin: { type: TrackListOriginType; uuid: string } } | null = null;

vi.mock("../TrackListContext", () => ({
  useTrackList: () => ({ trackList, playNewTrackListFromGenrePlaylist }),
}));

vi.mock("../useGenre", () => ({
  useUpdateGenre: () => ({ mutate: updateGenreMutate }),
}));

vi.mock("../useGenrePlaylist", () => ({
  useFetchGenrePlaylistDetailed: () => ({ mutate: fetchGenrePlaylistDetailed }),
}));

vi.mock("../../player/PlayerContext", () => ({
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
const criteriaUuid = "786837e1-99ff-4b1a-8298-22e4105b652b";
const playlistUuid = "e85e092c-4b53-449f-8e94-e2fca43f2988";

const genrePlaylist: CriteriaPlaylistSimple = {
  uuid: playlistUuid,
  name: "Electronic",
  criteria: { uuid: criteriaUuid, name: "Electronic" },
  parent: null,
  root: { uuid: playlistUuid, name: "Electronic" },
  tracksCount: 3,
  createdOn: "2026-06-20T20:24:17.718222Z",
  updatedOn: "2026-06-20T20:24:17.718222Z",
};

function renderTree(nodes: CriteriaPlaylistSimple[] = [genrePlaylist]) {
  render(
    <GenrePlaylistTreePerRoot
      scope="reference"
      rootUuid={playlistUuid}
      genrePlaylistTreePerRoot={nodes}
      reparentingGenreUuid={null}
      setReparentingGenreUuid={vi.fn()}
      handleGenreCreationAction={handleGenreCreationAction}
      handleGenreRenameAction={handleGenreRenameAction}
      getBackendBaseUrl={() => "https://api.example.com"}
      criteriaPlaylistDetailedSchema={z.any()}
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

  describe("handlePlayPause", () => {
    it("toggles play state when the node is already the playing track list's origin", () => {
      trackList = { origin: { type: TrackListOriginType.GENRE_PLAYLIST, uuid: playlistUuid } };
      isPlaying = true;
      renderTree();

      capturedProps!.onPlayPause!(playlistUuid);

      expect(setIsPlaying).toHaveBeenCalledWith(false);
      expect(fetchGenrePlaylistDetailed).not.toHaveBeenCalled();
    });

    it("fetches and plays the genre playlist when it isn't already playing", () => {
      renderTree();

      capturedProps!.onPlayPause!(playlistUuid);

      expect(fetchGenrePlaylistDetailed).toHaveBeenCalledWith(
        playlistUuid,
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
      );

      const detailedPlaylist = { uuid: playlistUuid };
      const { onSuccess } = fetchGenrePlaylistDetailed.mock.calls[0][1];
      onSuccess(detailedPlaylist);
      expect(playNewTrackListFromGenrePlaylist).toHaveBeenCalledWith(detailedPlaylist, "reference");
    });

    it("logs an error when fetching the detailed genre playlist fails", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      renderTree();

      capturedProps!.onPlayPause!(playlistUuid);

      const { onError } = fetchGenrePlaylistDetailed.mock.calls[0][1];
      onError(new Error("network error"));
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch detailed genre playlist:", expect.any(Error));
      expect(showPopup).toHaveBeenCalledWith(
        expect.objectContaining({ props: expect.objectContaining({ errorCode: ErrorCode.CLIENT_UNKNOWN }) }),
      );

      consoleErrorSpy.mockRestore();
    });

    it("does nothing for an empty genre playlist", () => {
      renderTree([{ ...genrePlaylist, tracksCount: 0 }]);

      capturedProps!.onPlayPause!(playlistUuid);

      expect(fetchGenrePlaylistDetailed).not.toHaveBeenCalled();
    });

    it("does nothing when the node has no matching genre-playlist", () => {
      renderTree();

      capturedProps!.onPlayPause!("unknown-node-id");

      expect(fetchGenrePlaylistDetailed).not.toHaveBeenCalled();
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
    it("omits create/rename/reparent handlers but keeps delete when readOnly is true", () => {
      render(
        <GenrePlaylistTreePerRoot
          scope="reference"
          rootUuid={playlistUuid}
          genrePlaylistTreePerRoot={[genrePlaylist]}
          reparentingGenreUuid={null}
          setReparentingGenreUuid={vi.fn()}
          handleGenreCreationAction={handleGenreCreationAction}
          handleGenreRenameAction={handleGenreRenameAction}
          getBackendBaseUrl={() => "https://api.example.com"}
          criteriaPlaylistDetailedSchema={z.any()}
          readOnly
        />,
      );

      expect(capturedProps!.onAddChild).toBeUndefined();
      expect(capturedProps!.onRenameRequest).toBeUndefined();
      expect(capturedProps!.onReparentRequest).toBeUndefined();
      expect(capturedProps!.onReparent).toBeUndefined();
      expect(capturedProps!.onDeleteRequest).toBeInstanceOf(Function);
    });

    it("keeps create/rename/reparent handlers when readOnly is omitted", () => {
      renderTree();

      expect(capturedProps!.onAddChild).toBeInstanceOf(Function);
      expect(capturedProps!.onRenameRequest).toBeInstanceOf(Function);
      expect(capturedProps!.onReparentRequest).toBeInstanceOf(Function);
      expect(capturedProps!.onReparent).toBeInstanceOf(Function);
    });
  });

  describe("handleReparentRequest / handleReparent", () => {
    it("sets the reparenting genre uuid on request", () => {
      const setReparentingGenreUuid = vi.fn();
      render(
        <GenrePlaylistTreePerRoot
          scope="reference"
          rootUuid={playlistUuid}
          genrePlaylistTreePerRoot={[genrePlaylist]}
          reparentingGenreUuid={null}
          setReparentingGenreUuid={setReparentingGenreUuid}
          handleGenreCreationAction={handleGenreCreationAction}
          handleGenreRenameAction={handleGenreRenameAction}
          getBackendBaseUrl={() => "https://api.example.com"}
          criteriaPlaylistDetailedSchema={z.any()}
        />,
      );

      capturedProps!.onReparentRequest!({ id: playlistUuid, parentId: null, name: "Electronic", itemCount: 3, actionable: true });

      expect(setReparentingGenreUuid).toHaveBeenCalledWith(playlistUuid);
    });

    it("submits the reparent mutation and clears reparenting state on success", () => {
      const newParentUuid = "9c1e6c1a-1111-4a2a-8c2a-111111111111";
      const setReparentingGenreUuid = vi.fn();
      render(
        <GenrePlaylistTreePerRoot
          scope="reference"
          rootUuid={playlistUuid}
          genrePlaylistTreePerRoot={[genrePlaylist]}
          reparentingGenreUuid={playlistUuid}
          setReparentingGenreUuid={setReparentingGenreUuid}
          handleGenreCreationAction={handleGenreCreationAction}
          handleGenreRenameAction={handleGenreRenameAction}
          getBackendBaseUrl={() => "https://api.example.com"}
          criteriaPlaylistDetailedSchema={z.any()}
        />,
      );

      capturedProps!.onReparent!(playlistUuid, newParentUuid);

      expect(updateGenreMutate).toHaveBeenCalledWith(
        { uuid: playlistUuid, data: { parent: newParentUuid } },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );

      const { onSuccess } = updateGenreMutate.mock.calls[0][1];
      onSuccess();
      expect(setReparentingGenreUuid).toHaveBeenCalledWith(null);
    });
  });
});
