"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import {
  GenreTreeWheel,
  type ControlsOrientation,
  type GenreTreeViewport,
  type GenreTreeAction,
  type GenreTreeNode,
  type InfoPanelBody,
  type InfoPanelSections,
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
import { genrePlaylistSize, type GenreTreeSizeMetric } from "./size-metric";
import { capitalize, useTrackNoun } from "@behindthemusictree/app-kit/track-noun";

export type GenrePlaylistTreeWheelProps<T extends TrackBase> = {
  scope: Scope;
  className?: string;
  genrePlaylists: CriteriaPlaylistSimple[];
  handleGenreCreationAction: (parent: CriteriaMinimum | null) => void;
  handleGenreRenameAction: (genre: CriteriaMinimum) => void;
  additionalActions?: (node: GenreTreeNode) => GenreTreeAction[];
  onNodeClick?: (node: GenreTreeNode) => void;
  onNodeHover?: (node: GenreTreeNode) => void;
  renderInfoPanelBody?: (node: GenreTreeNode, sections: InfoPanelSections) => InfoPanelBody;
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
  /** When false, clicking a chip still selects its root, but the wheel doesn't spin to the
   * anchor. Defaults to true. */
  allowWheelRotation?: boolean;
  /** When false, suppresses the hover toolbar on every node. Defaults to true. */
  showToolbar?: boolean;
  /** Layout of the floating zoom/pop/fit controls. Defaults to "vertical". */
  controlsOrientation?: ControlsOrientation;
  /** What node size is proportional to; defaults to the song count. */
  sizeMetric?: GenreTreeSizeMetric;
  /** Rendered in the floating controls, beside the zoom buttons. */
  floatingControlsLeading?: ReactNode;
  /** Shows the tree's busy indicator while the data behind it is changing. */
  busy?: boolean;
  /** Mount-only seed for the pan/zoom, replacing the initial fit. */
  defaultViewport?: GenreTreeViewport;
  /** Fires after a user-driven pan/zoom settles. */
  onViewportChange?: (viewport: GenreTreeViewport) => void;
  /** What node play buttons play; defaults to each node's whole genre playlist. */
  playback?: GenrePlaylistPlayback;
} & InfoPanelCurationProps;

export default function GenrePlaylistTreeWheel<T extends TrackBase>({
  scope,
  className,
  genrePlaylists,
  handleGenreCreationAction,
  handleGenreRenameAction,
  additionalActions,
  onNodeClick,
  onNodeHover,
  renderInfoPanelBody,
  selectedNodeId,
  onSelectedNodeChange,
  hideInfoPanelClose,
  hideInfoPanelTitle,
  readOnly = false,
  allowWheelRotation,
  showToolbar,
  controlsOrientation,
  sizeMetric = "songs",
  floatingControlsLeading,
  busy,
  defaultViewport,
  onViewportChange,
  playback,
  ...infoPanelCuration
}: GenrePlaylistTreeWheelProps<T>) {
  const { isPlaying, setIsPlaying } = usePlayer();
  const defaultPlayback = useGenrePlaylistPlayback<T>({ scope, genrePlaylists });
  const { playingNodeId, play } = playback ?? defaultPlayback;
  const trackNoun = useTrackNoun();
  const { showPopup } = usePopup();

  const nodes: GenreTreeNode[] = useMemo(
    () =>
      genrePlaylists.map((genrePlaylist) => ({
        id: genrePlaylist.uuid,
        parentId: genrePlaylist.parent?.uuid ?? null,
        name: genrePlaylist.name,
        itemCount: genrePlaylistSize(genrePlaylist, sizeMetric),
        actionable: Boolean(genrePlaylist.criteria),
        side: genrePlaylist.criteria?.side ?? undefined,
        wikidataId: genrePlaylist.criteria?.wikidataId ?? null,
      })),
    [genrePlaylists, sizeMetric],
  );

  const handlePlayPause = useCallback(
    (nodeId: string) => {
      const genrePlaylist = genrePlaylists.find((g) => g.uuid === nodeId);
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
      genrePlaylists,
      playingNodeId,
      isPlaying,
      setIsPlaying,
      play,
      showPopup,
    ],
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

  return (
    <GenreTreeWheel
      className={className}
      nodes={nodes}
      itemCountLabel={sizeMetric === "views" ? "Views" : `${capitalize(trackNoun.singular)} count`}
      playingNodeId={playingNodeId}
      playState={isPlaying ? "playing" : "paused"}
      onPlayPause={handlePlayPause}
      onAddChild={readOnly ? undefined : handleAddChild}
      onRenameRequest={readOnly ? undefined : handleRenameRequest}
      onDeleteRequest={readOnly ? undefined : handleDeleteRequest}
      additionalActions={additionalActions}
      onNodeClick={onNodeClick}
      onNodeHover={onNodeHover}
      renderInfoPanelBody={renderInfoPanelBody}
      selectedNodeId={selectedNodeId}
      onSelectedNodeChange={onSelectedNodeChange}
      hideInfoPanelClose={hideInfoPanelClose}
      hideInfoPanelTitle={hideInfoPanelTitle}
      allowWheelRotation={allowWheelRotation}
      showToolbar={showToolbar}
      controlsOrientation={controlsOrientation}
      floatingControlsLeading={floatingControlsLeading}
      busy={busy}
      defaultViewport={defaultViewport}
      onViewportChange={onViewportChange}
      {...infoPanelCuration}
      readOnly={readOnly}
    />
  );
}
