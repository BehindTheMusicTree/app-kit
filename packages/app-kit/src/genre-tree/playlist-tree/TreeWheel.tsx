"use client";

import { useCallback, useMemo } from "react";
import { GenreTreeWheel, type GenreTreeNode } from "@behindthemusictree/genre-tree-view";

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

export type GenrePlaylistTreeWheelProps = {
  scope: Scope;
  className?: string;
  genrePlaylists: CriteriaPlaylistSimple[];
  reparentingGenreUuid: string | null;
  setReparentingGenreUuid: (uuid: string | null) => void;
  handleGenreCreationAction: (parent: CriteriaMinimum | null) => void;
  /** See `GenrePlaylistTreePerRoot`'s doc comment on the same prop. */
  handleGenreRenameAction?: (genre: CriteriaMinimum) => void;
  getBackendBaseUrl: () => string;
  /** Passed straight through to `TrackUploadPopup`. See its own doc comment. */
  uploadTimeoutMs: number;
};

export default function GenrePlaylistTreeWheel({
  scope,
  className,
  genrePlaylists,
  reparentingGenreUuid,
  setReparentingGenreUuid,
  handleGenreCreationAction,
  handleGenreRenameAction,
  getBackendBaseUrl,
  uploadTimeoutMs,
}: GenrePlaylistTreeWheelProps) {
  const { isPlaying, setIsPlaying } = usePlayer();
  const { showPopup, hidePopup } = usePopup();
  const { trackList, playNewTrackListFromGenrePlaylist } = useTrackList();
  const { mutate: updateGenreMutate } = useUpdateGenre(scope, getBackendBaseUrl);
  const { mutate: fetchGenrePlaylistDetailed } = useFetchGenrePlaylistDetailed(scope, getBackendBaseUrl);
  const { mutateAsync: uploadedTrackMutateAsync } = useUploadTrack(scope, getBackendBaseUrl);

  const nodes: GenreTreeNode[] = useMemo(
    () =>
      genrePlaylists.map((genrePlaylist) => ({
        id: genrePlaylist.uuid,
        parentId: genrePlaylist.parent?.uuid ?? null,
        name: genrePlaylist.name,
        itemCount: genrePlaylist.tracksCount,
        actionable: Boolean(genrePlaylist.criteria),
      })),
    [genrePlaylists],
  );

  const playingNodeId =
    trackList && trackList.origin.type === TrackListOriginType.GENRE_PLAYLIST ? trackList.origin.uuid : null;

  const handlePlayPause = useCallback(
    (nodeId: string) => {
      const genrePlaylist = genrePlaylists.find((g) => g.uuid === nodeId);
      if (!genrePlaylist) return;

      if (
        trackList &&
        trackList.origin.type === TrackListOriginType.GENRE_PLAYLIST &&
        trackList.origin.uuid === genrePlaylist.uuid
      ) {
        setIsPlaying(!isPlaying);
        return;
      }

      if (genrePlaylist.tracksCount === 0) {
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
    [genrePlaylists, trackList, isPlaying, setIsPlaying, playNewTrackListFromGenrePlaylist, fetchGenrePlaylistDetailed, scope],
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      const genrePlaylist = genrePlaylists.find((g) => g.uuid === parentId);
      if (!genrePlaylist?.criteria) return;
      handleGenreCreationAction(genrePlaylist.criteria);
    },
    [genrePlaylists, handleGenreCreationAction],
  );

  const handleRenameRequest = useCallback(
    (node: GenreTreeNode) => {
      const genrePlaylist = genrePlaylists.find((g) => g.uuid === node.id);
      if (!genrePlaylist?.criteria) return;
      handleGenreRenameAction?.(genrePlaylist.criteria);
    },
    [genrePlaylists, handleGenreRenameAction],
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
      const genrePlaylist = genrePlaylists.find((g) => g.uuid === nodeId);
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
    [genrePlaylists, showPopup, hidePopup, uploadedTrackMutateAsync, uploadTimeoutMs],
  );

  return (
    <GenreTreeWheel
      className={className}
      nodes={nodes}
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
