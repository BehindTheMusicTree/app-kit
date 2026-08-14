"use client";

import { useCallback, useMemo } from "react";
import { GenreTree, getGenreTreeColor, type GenreTreeNode } from "@behindthemusictree/genre-tree-view";

import { usePopup } from "../../popup/PopupContext";
import { useTrackList } from "../TrackListContext";
import { useUpdateGenre } from "../useGenre";
import { useFetchGenrePlaylistDetailed } from "../useGenrePlaylist";
import { usePlayer } from "../../player/PlayerContext";

import { TrackListOriginType } from "../models/TrackListOriginType";

import TrackUploadPopup from "../../popup/TrackUploadPopup";
import { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";
import { CriteriaMinimum } from "../schemas/criteria/minimum";
import { Scope } from "../../transport/lib/scope";
import { useUploadTrack } from "../useUploadedTrack";

export type GenrePlaylistTreePerRootProps = {
  scope: Scope;
  className?: string;
  rootUuid: string;
  genrePlaylistTreePerRoot: CriteriaPlaylistSimple[];
  reparentingGenreUuid: string | null;
  setReparentingGenreUuid: (uuid: string | null) => void;
  handleGenreCreationAction: (parent: CriteriaMinimum | null) => void;
  /**
   * Opens a rename UI for `genre` (e.g. a popup collecting the new name). Not provided by this
   * package (grow's original `GenreRenamePopup`/`InvalidInputPopup` are app-specific, not moved
   * here) — the consumer implements its own popup and calls `useUpdateGenre` (exported from this
   * same `genre-tree` module) to submit it. If omitted, rename is a no-op.
   */
  handleGenreRenameAction?: (genre: CriteriaMinimum) => void;
  getBackendBaseUrl: () => string;
  /** Passed straight through to `TrackUploadPopup`. See its own doc comment. */
  uploadTimeoutMs: number;
};

export default function GenrePlaylistTreePerRoot({
  scope,
  className,
  rootUuid,
  genrePlaylistTreePerRoot,
  reparentingGenreUuid,
  setReparentingGenreUuid,
  handleGenreCreationAction,
  handleGenreRenameAction,
  getBackendBaseUrl,
  uploadTimeoutMs,
}: GenrePlaylistTreePerRootProps) {
  const { isPlaying, setIsPlaying } = usePlayer();
  const { showPopup, hidePopup } = usePopup();
  const { trackList, playNewTrackListFromGenrePlaylist } = useTrackList();
  const { mutate: updateGenreMutate } = useUpdateGenre(scope, getBackendBaseUrl);
  const { mutate: fetchGenrePlaylistDetailed } = useFetchGenrePlaylistDetailed(scope, getBackendBaseUrl);
  const { mutateAsync: uploadedTrackMutateAsync } = useUploadTrack(scope, getBackendBaseUrl);

  const nodes: GenreTreeNode[] = useMemo(
    () =>
      genrePlaylistTreePerRoot.map((genrePlaylist) => ({
        id: genrePlaylist.uuid,
        parentId: genrePlaylist.parent?.uuid ?? null,
        name: genrePlaylist.name,
        itemCount: genrePlaylist.uploadedTracksCount,
        actionable: Boolean(genrePlaylist.criteria),
      })),
    [genrePlaylistTreePerRoot],
  );

  const playingNodeId =
    trackList && trackList.origin.type === TrackListOriginType.GENRE_PLAYLIST ? trackList.origin.uuid : null;

  const handlePlayPause = useCallback(
    (nodeId: string) => {
      const genrePlaylist = genrePlaylistTreePerRoot.find((g) => g.uuid === nodeId);
      if (!genrePlaylist) return;

      if (
        trackList &&
        trackList.origin.type === TrackListOriginType.GENRE_PLAYLIST &&
        trackList.origin.uuid === genrePlaylist.uuid
      ) {
        setIsPlaying(!isPlaying);
        return;
      }

      if (genrePlaylist.uploadedTracksCount === 0) {
        return;
      }

      fetchGenrePlaylistDetailed(genrePlaylist.uuid, {
        onSuccess: (detailedPlaylist) => {
          playNewTrackListFromGenrePlaylist(detailedPlaylist, scope);
        },
        onError: (error) => {
          console.error("Failed to fetch detailed genre playlist:", error);
        },
      });
    },
    [genrePlaylistTreePerRoot, trackList, isPlaying, setIsPlaying, playNewTrackListFromGenrePlaylist, fetchGenrePlaylistDetailed, scope],
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      const genrePlaylist = genrePlaylistTreePerRoot.find((g) => g.uuid === parentId);
      if (!genrePlaylist?.criteria) return;
      handleGenreCreationAction(genrePlaylist.criteria);
    },
    [genrePlaylistTreePerRoot, handleGenreCreationAction],
  );

  const handleRenameRequest = useCallback(
    (node: GenreTreeNode) => {
      const genrePlaylist = genrePlaylistTreePerRoot.find((g) => g.uuid === node.id);
      if (!genrePlaylist?.criteria) return;
      handleGenreRenameAction?.(genrePlaylist.criteria);
    },
    [genrePlaylistTreePerRoot, handleGenreRenameAction],
  );

  const handleDeleteRequest = useCallback((node: GenreTreeNode) => {
    if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
      // TODO: Implement delete genre
    }
  }, []);

  const handleReparentRequest = useCallback(
    (node: GenreTreeNode) => {
      setReparentingGenreUuid(node.id);
    },
    [setReparentingGenreUuid],
  );

  const handleReparent = useCallback(
    (nodeId: string, newParentId: string) => {
      updateGenreMutate(
        { uuid: nodeId, data: { parent: newParentId } },
        {
          onSuccess: () => {
            setReparentingGenreUuid(null);
          },
        },
      );
    },
    [updateGenreMutate, setReparentingGenreUuid],
  );

  const handleUploadFiles = useCallback(
    (nodeId: string, files: File[]) => {
      const genrePlaylist = genrePlaylistTreePerRoot.find((g) => g.uuid === nodeId);
      if (!genrePlaylist?.criteria) return;

      showPopup(
        <TrackUploadPopup
          files={files}
          genre={genrePlaylist.criteria.uuid}
          onProcessFile={(file, genre) => uploadedTrackMutateAsync({ file, genre })}
          onComplete={() => {}}
          onClose={hidePopup}
          uploadTimeoutMs={uploadTimeoutMs}
        />,
      );
    },
    [genrePlaylistTreePerRoot, showPopup, hidePopup, uploadedTrackMutateAsync, uploadTimeoutMs],
  );

  return (
    <GenreTree
      className={className}
      nodes={nodes}
      rootColor={getGenreTreeColor(rootUuid)}
      playingNodeId={playingNodeId}
      playState={isPlaying ? "playing" : "paused"}
      reparentingNodeId={reparentingGenreUuid}
      onPlayPause={handlePlayPause}
      onAddChild={handleAddChild}
      onRenameRequest={handleRenameRequest}
      onDeleteRequest={handleDeleteRequest}
      onReparentRequest={handleReparentRequest}
      onReparent={handleReparent}
      onUploadFiles={handleUploadFiles}
    />
  );
}
