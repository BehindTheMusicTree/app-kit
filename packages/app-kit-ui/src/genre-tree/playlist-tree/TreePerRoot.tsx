"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import {
  GenreTree,
  getGenreTreeColor,
  type ControlsOrientation,
  type GenreTreeViewport,
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
import type { InfoPanelCurationProps } from "./infoPanelCurationProps";
import { useGenrePlaylistPlayback, type GenrePlaylistPlayback } from "./useGenrePlaylistPlayback";
import { capitalize, useTrackNoun } from "@behindthemusictree/app-kit/track-noun";

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
  renderExtraDetails?: (node: GenreTreeNode) => ReactNode;
  /** Overrides which node is shown highlighted, e.g. from a search selection. */
  selectedNodeId?: string | null;
  /** Fires when a user action changes the info panel's node, or `null` when it is closed. */
  onSelectedNodeChange?: (node: GenreTreeNode | null) => void;
  /** Hides the info panel's header close button. */
  hideInfoPanelClose?: boolean;
  /** Hides the info panel header's node name. */
  hideInfoPanelTitle?: boolean;
  /** When true, suppresses per-node create/rename affordances. Defaults to false. */
  readOnly?: boolean;
  /** When false, suppresses the hover toolbar on every node. Defaults to true. */
  showToolbar?: boolean;
  wheelZoom?: WheelZoomMode;
  /** Layout of the floating zoom/pop/fit controls. Defaults to "vertical". */
  controlsOrientation?: ControlsOrientation;
  /** Mount-only seed for the pan/zoom, replacing the initial fit. */
  defaultViewport?: GenreTreeViewport;
  /** Fires after a user-driven pan/zoom settles. */
  onViewportChange?: (viewport: GenreTreeViewport) => void;
  /** What node play buttons play; defaults to each node's whole genre playlist. */
  playback?: GenrePlaylistPlayback;
} & InfoPanelCurationProps;

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
  renderExtraDetails,
  selectedNodeId,
  onSelectedNodeChange,
  hideInfoPanelClose,
  hideInfoPanelTitle,
  readOnly = false,
  showToolbar,
  wheelZoom,
  controlsOrientation,
  defaultViewport,
  onViewportChange,
  playback,
  ...infoPanelCuration
}: GenrePlaylistTreePerRootProps<T>) {
  const { isPlaying, setIsPlaying } = usePlayer();
  const defaultPlayback = useGenrePlaylistPlayback<T>({ scope, genrePlaylists: genrePlaylistTreePerRoot });
  const { playingNodeId, play } = playback ?? defaultPlayback;
  const trackNoun = useTrackNoun();
  const { showPopup } = usePopup();

  const nodes: GenreTreeNode[] = useMemo(
    () =>
      genrePlaylistTreePerRoot.map((genrePlaylist) => ({
        id: genrePlaylist.uuid,
        parentId: genrePlaylist.parent?.uuid ?? null,
        name: genrePlaylist.name,
        itemCount: genrePlaylist.tracksCount,
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

      if (genrePlaylist.tracksCount === 0) {
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
      itemCountLabel={`${capitalize(trackNoun.singular)} count`}
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
      renderExtraDetails={renderExtraDetails}
      selectedNodeId={selectedNodeId}
      onSelectedNodeChange={onSelectedNodeChange}
      hideInfoPanelClose={hideInfoPanelClose}
      hideInfoPanelTitle={hideInfoPanelTitle}
      showToolbar={showToolbar}
      wheelZoom={wheelZoom}
      controlsOrientation={controlsOrientation}
      defaultViewport={defaultViewport}
      onViewportChange={onViewportChange}
      {...infoPanelCuration}
      readOnly={readOnly}
    />
  );
}
