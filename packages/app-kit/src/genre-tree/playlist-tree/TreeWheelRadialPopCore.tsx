"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import {
  GenreTreeOutline,
  GenreTreeWheelRadialPopCore,
  type GenreTreeAction,
  type GenreTreeNode,
} from "@behindthemusictree/genre-tree-view";

import { useTrackList } from "../TrackListContext";
import { useUpdateGenre } from "../useGenre";
import { usePlayer } from "../../player/PlayerContext";

import { TrackListOriginType } from "../models/TrackListOriginType";
import { TrackBase } from "../schemas/track/base";

import { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";
import { CriteriaMinimum } from "../schemas/criteria/minimum";
import { Scope } from "../../transport/lib/scope";

export type GenrePlaylistTreeWheelRadialPopCoreProps<T extends TrackBase> = {
  scope: Scope;
  className?: string;
  genrePlaylists: CriteriaPlaylistSimple[];
  reparentingGenreUuid: string | null;
  setReparentingGenreUuid: (uuid: string | null) => void;
  handleGenreCreationAction: (parent: CriteriaMinimum | null) => void;
  handleGenreRenameAction: (genre: CriteriaMinimum) => void;
  getBackendBaseUrl: () => string;
  additionalActions?: (node: GenreTreeNode) => GenreTreeAction[];
  onNodeClick?: (node: GenreTreeNode) => void;
  onNodeHover?: (node: GenreTreeNode) => void;
  renderExtraDetails?: (node: GenreTreeNode) => ReactNode;
  /** Overrides which node is shown highlighted, e.g. from a search selection. */
  selectedNodeId?: string | null;
  /** When true, suppresses per-node create/rename/reparent affordances. Defaults to false. */
  readOnly?: boolean;
  /** When false, clicking a chip still selects its root, but the ring doesn't spin to the
   * landing angle. Defaults to true. */
  allowWheelRotation?: boolean;
  /** When false, suppresses the hover toolbar on every node. Defaults to true. */
  showToolbar?: boolean;
  /** When true, renders the same forest as GenreTreeOutline's nested-list text view instead of
   * the radial wheel. Defaults to false. */
  outline?: boolean;
};

export default function GenrePlaylistTreeWheelRadialPopCore<T extends TrackBase>({
  scope,
  className,
  genrePlaylists,
  reparentingGenreUuid,
  setReparentingGenreUuid,
  handleGenreCreationAction,
  handleGenreRenameAction,
  getBackendBaseUrl,
  additionalActions,
  onNodeClick,
  onNodeHover,
  renderExtraDetails,
  selectedNodeId,
  readOnly = false,
  allowWheelRotation,
  showToolbar,
  outline = false,
}: GenrePlaylistTreeWheelRadialPopCoreProps<T>) {
  const { isPlaying, setIsPlaying } = usePlayer();
  const { trackList, playNewTrackListFromGenrePlaylist } = useTrackList<T>();
  const { mutate: updateGenreMutate } = useUpdateGenre(scope, getBackendBaseUrl);

  const nodes: GenreTreeNode[] = useMemo(
    () =>
      genrePlaylists.map((genrePlaylist) => ({
        id: genrePlaylist.uuid,
        parentId: genrePlaylist.parent?.uuid ?? null,
        name: genrePlaylist.name,
        itemCount: genrePlaylist.tracksCount,
        actionable: Boolean(genrePlaylist.criteria),
        side: genrePlaylist.criteria?.side ?? undefined,
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

      playNewTrackListFromGenrePlaylist(genrePlaylist, scope).catch((error) => {
        console.error("Failed to load genre playlist tracks:", error);
      });
    },
    [genrePlaylists, trackList, isPlaying, setIsPlaying, playNewTrackListFromGenrePlaylist, scope],
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

  const treeProps = {
    className,
    nodes,
    playingNodeId,
    playState: isPlaying ? ("playing" as const) : ("paused" as const),
    reparentingNodeId: reparentingGenreUuid,
    onPlayPause: handlePlayPause,
    onAddChild: readOnly ? undefined : handleAddChild,
    onRenameRequest: readOnly ? undefined : handleRenameRequest,
    onDeleteRequest: readOnly ? undefined : handleDeleteRequest,
    onReparentRequest: readOnly ? undefined : handleReparentRequest,
    onReparent: readOnly ? undefined : handleReparent,
    additionalActions,
    onNodeClick,
    onNodeHover,
    renderExtraDetails,
    selectedNodeId,
    showToolbar,
  };

  return outline ? (
    <GenreTreeOutline {...treeProps} />
  ) : (
    <GenreTreeWheelRadialPopCore {...treeProps} allowWheelRotation={allowWheelRotation} />
  );
}
