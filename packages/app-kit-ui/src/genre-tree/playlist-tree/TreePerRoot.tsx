"use client";

import { genrePlaylistTrackCount } from "@behindthemusictree/app-kit/genre-tree";

import { useCallback, useMemo } from "react";
import {
  GenreTree,
  getGenreTreeColor,
  type GenreTreeViewport,
  type GenreTreeProps,
  type GenreTreeAction,
  type GenreTreeNode,
  type WheelZoomMode,
} from "@behindthemusictree/genre-tree-view";

import { usePlayer } from "@behindthemusictree/app-kit/player";
import { usePopup } from "@behindthemusictree/app-kit/popup";
import InternalErrorPopup from "../../popup/InternalErrorPopup";
import { ErrorCode } from "@behindthemusictree/app-kit/transport";

import { TrackBase } from "@behindthemusictree/app-kit/genre-tree";

import { CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";
import { CriteriaMinimum } from "@behindthemusictree/app-kit/genre-tree";
import { Scope } from "@behindthemusictree/app-kit/transport";
import type { HostPanelProps } from "./hostPanelProps";
import { useGenrePlaylistPlayback, type GenrePlaylistPlayback } from "./useGenrePlaylistPlayback";

export type GenrePlaylistTreePerRootProps<T extends TrackBase> = {
  scope: Scope;
  className?: string;
  rootUuid: string;
  genrePlaylistTreePerRoot: CriteriaPlaylistSimple[];
  handleGenreCreationAction: (parent: CriteriaMinimum | null) => void;
  handleGenreRenameAction: (genre: CriteriaMinimum) => void;
  additionalActions?: (node: GenreTreeNode) => GenreTreeAction[];
  onNodeClick?: (node: GenreTreeNode) => void;
  onNodeHover?: (node: GenreTreeNode) => void;
  /** Overrides which node is shown highlighted, e.g. from a search selection. */
  selectedNodeId?: string | null;
  /** Fires when a user action changes the info panel's node, or `null` when it is closed. */
  onSelectedNodeChange?: (node: GenreTreeNode | null) => void;
  /** When true, suppresses per-node create/rename affordances. Defaults to false. */
  readOnly?: boolean;
  wheelZoom?: WheelZoomMode;
  /** Mount-only seed for the pan/zoom, replacing the initial fit. */
  defaultViewport?: GenreTreeViewport;
  /** Runtime viewport restoration request. */
  viewportRestore?: GenreTreeProps["viewportRestore"];
  /** Fires after a user-driven pan/zoom settles. */
  onViewportChange?: (viewport: GenreTreeViewport) => void;
  /** What node play buttons play; defaults to each node's whole genre playlist. */
  playback?: GenrePlaylistPlayback;
} & HostPanelProps;

export default function GenrePlaylistTreePerRoot<T extends TrackBase>({
  scope,
  className,
  rootUuid,
  genrePlaylistTreePerRoot,
  handleGenreCreationAction,
  handleGenreRenameAction,
  additionalActions,
  onNodeClick,
  onNodeHover,
  selectedNodeId,
  onSelectedNodeChange,
  readOnly = false,
  wheelZoom,
  defaultViewport,
  viewportRestore,
  onViewportChange,
  playback,
  ...hostPanel
}: GenrePlaylistTreePerRootProps<T>) {
  const { isPlaying, setIsPlaying } = usePlayer();
  const defaultPlayback = useGenrePlaylistPlayback<T>({ scope, genrePlaylists: genrePlaylistTreePerRoot });
  const { playingNodeId, play } = playback ?? defaultPlayback;
  const { showPopup } = usePopup();

  const nodes: GenreTreeNode[] = useMemo(
    () =>
      genrePlaylistTreePerRoot.map((genrePlaylist) => ({
        id: genrePlaylist.uuid,
        parentId: genrePlaylist.parent?.uuid ?? null,
        name: genrePlaylist.name,
        itemCount: genrePlaylistTrackCount(genrePlaylist),
        actionable: Boolean(genrePlaylist.criteria),
        side: genrePlaylist.criteria?.side ?? undefined,
        wikidataId: genrePlaylist.criteria?.wikidataId ?? null,
        umbrella: genrePlaylist.isUmbrella,
      })),
    [genrePlaylistTreePerRoot],
  );

  const handlePlayPause = useCallback(
    (nodeId: string) => {
      const genrePlaylist = genrePlaylistTreePerRoot.find((g) => g.uuid === nodeId);
      if (!genrePlaylist) return;

      if (nodeId === playingNodeId) {
        setIsPlaying(!isPlaying);
        return;
      }

      if (genrePlaylistTrackCount(genrePlaylist) === 0) {
        return;
      }

      play(genrePlaylist).catch((error) => {
        console.error("Failed to load genre playlist tracks:", error);
        showPopup(<InternalErrorPopup errorCode={ErrorCode.CLIENT_UNKNOWN} />);
      });
    },
    [
      genrePlaylistTreePerRoot,
      playingNodeId,
      isPlaying,
      setIsPlaying,
      play,
      showPopup,
    ],
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
      handleGenreRenameAction(genrePlaylist.criteria);
    },
    [genrePlaylistTreePerRoot, handleGenreRenameAction],
  );

  const handleDeleteRequest = useCallback((node: GenreTreeNode) => {
    if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
      // TODO: Implement delete genre
    }
  }, []);

  return (
    <GenreTree
      className={className}
      nodes={nodes}
      rootColor={getGenreTreeColor(rootUuid)}
      playingNodeId={playingNodeId}
      playState={isPlaying ? "playing" : "paused"}
      onPlayPause={handlePlayPause}
      onAddChild={readOnly ? undefined : handleAddChild}
      onRenameRequest={readOnly ? undefined : handleRenameRequest}
      onDeleteRequest={readOnly ? undefined : handleDeleteRequest}
      additionalActions={additionalActions}
      onNodeClick={onNodeClick}
      onNodeHover={onNodeHover}
      selectedNodeId={selectedNodeId}
      onSelectedNodeChange={onSelectedNodeChange}
      wheelZoom={wheelZoom}
      defaultViewport={defaultViewport}
      viewportRestore={viewportRestore}
      onViewportChange={onViewportChange}
      {...hostPanel}
    />
  );
}
