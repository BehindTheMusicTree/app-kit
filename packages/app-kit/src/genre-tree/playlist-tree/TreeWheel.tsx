"use client";

import { useCallback, useMemo } from "react";
import { z } from "zod";
import {
  GenreTreeWheel,
  type GenreTreeAction,
  type GenreTreeNode,
} from "@behindthemusictree/genre-tree-view";

import { useTrackList } from "../TrackListContext";
import { useUpdateGenre } from "../useGenre";
import { useFetchGenrePlaylistDetailed } from "../useGenrePlaylist";
import { usePlayer } from "../../player/PlayerContext";

import { TrackListOriginType } from "../models/TrackListOriginType";
import { TrackBase } from "../schemas/track/base";
import { CriteriaPlaylistDetailedLike } from "../models/TrackListOrigin";

import { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";
import { CriteriaMinimum } from "../schemas/criteria/minimum";
import { Scope } from "../../transport/lib/scope";

export type GenrePlaylistTreeWheelProps<T extends TrackBase> = {
  scope: Scope;
  className?: string;
  genrePlaylists: CriteriaPlaylistSimple[];
  reparentingGenreUuid: string | null;
  setReparentingGenreUuid: (uuid: string | null) => void;
  handleGenreCreationAction: (parent: CriteriaMinimum | null) => void;
  handleGenreRenameAction: (genre: CriteriaMinimum) => void;
  getBackendBaseUrl: () => string;
  criteriaPlaylistDetailedSchema: z.ZodType<CriteriaPlaylistDetailedLike<T>>;
  additionalActions?: (node: GenreTreeNode) => GenreTreeAction[];
  /** When true, suppresses per-node create/rename/reparent affordances. Defaults to false. */
  readOnly?: boolean;
};

export default function GenrePlaylistTreeWheel<T extends TrackBase>({
  scope,
  className,
  genrePlaylists,
  reparentingGenreUuid,
  setReparentingGenreUuid,
  handleGenreCreationAction,
  handleGenreRenameAction,
  getBackendBaseUrl,
  criteriaPlaylistDetailedSchema,
  additionalActions,
  readOnly = false,
}: GenrePlaylistTreeWheelProps<T>) {
  const { isPlaying, setIsPlaying } = usePlayer();
  const { trackList, playNewTrackListFromGenrePlaylist } = useTrackList<T>();
  const { mutate: updateGenreMutate } = useUpdateGenre(scope, getBackendBaseUrl);
  const { mutate: fetchGenrePlaylistDetailed } = useFetchGenrePlaylistDetailed(
    scope,
    getBackendBaseUrl,
    criteriaPlaylistDetailedSchema,
  );

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
      handleGenreRenameAction(genrePlaylist.criteria);
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

  return (
    <GenreTreeWheel
      className={className}
      nodes={nodes}
      playingNodeId={playingNodeId}
      playState={isPlaying ? "playing" : "paused"}
      reparentingNodeId={reparentingGenreUuid}
      onPlayPause={handlePlayPause}
      onAddChild={readOnly ? undefined : handleAddChild}
      onRenameRequest={readOnly ? undefined : handleRenameRequest}
      onDeleteRequest={handleDeleteRequest}
      onReparentRequest={readOnly ? undefined : handleReparentRequest}
      onReparent={readOnly ? undefined : handleReparent}
      additionalActions={additionalActions}
    />
  );
}
