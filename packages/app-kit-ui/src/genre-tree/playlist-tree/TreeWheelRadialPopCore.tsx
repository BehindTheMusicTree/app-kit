"use client";

import { genrePlaylistTrackCount } from "@behindthemusictree/app-kit/genre-tree";

import { useCallback, useMemo, type ReactNode } from "react";
import {
  GenreTreeOutline,
  GenreTreeWheelRadialPopCore,
  type GenreTreeViewport,
  type GenreTreeProps,
  type FocusChangeReason,
  type GenreTreeAction,
  type GenreTreeNode,
} from "@behindthemusictree/genre-tree-view";

import { usePlayer } from "@behindthemusictree/app-kit/player";

import { TrackBase } from "@behindthemusictree/app-kit/genre-tree";

import { CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";
import { CriteriaMinimum } from "@behindthemusictree/app-kit/genre-tree";
import { Scope } from "@behindthemusictree/app-kit/transport";
import type { HostPanelProps } from "./hostPanelProps";
import { useGenrePlaylistPlayback, type GenrePlaylistPlayback } from "./useGenrePlaylistPlayback";
import type { GenreTreeSizeMetric } from "./size-metric";
import { toTreeNodes } from "./toTreeNodes";

/** Pop-core focus is controlled-only: pass both props or neither. Ignored in outline mode. */
export type GenreFocusProps =
  | { focusGenreUuid?: undefined; onFocusGenreChange?: undefined }
  | {
      /** Zooms the pop-core wheel into this genre's subtree. An unknown or non-zoomable uuid shows
       * the whole tree and fires `onFocusGenreChange(null, "rejected")`. */
      focusGenreUuid: string | null;
      /** Fires with the genre to focus and why: `"zoom-in"` / `"back"` (parent) / `"previous"` /
       * `"root"` from the user's zoom controls, `"search"` when a selection outside the zoom refocuses
       * to its top-level root (null for Mainstream Pop), and
       * `"rejected"` when an invalid `focusGenreUuid` is reset to null. */
      onFocusGenreChange: (uuid: string | null, reason: FocusChangeReason) => void;
    };

export type GenrePlaylistTreeWheelRadialPopCoreProps<T extends TrackBase> = {
  scope: Scope;
  className?: string;
  genrePlaylists: CriteriaPlaylistSimple[];
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
  /** When false, clicking a chip still selects its root, but the ring doesn't spin to the
   * landing angle. Defaults to true. */
  allowWheelRotation?: boolean;
  /** What node size is proportional to; defaults to the song count. */
  sizeMetric?: GenreTreeSizeMetric;
  /** Rendered in the floating controls, beside the zoom buttons. */
  floatingControlsLeading?: ReactNode;
  /** Shows the tree's busy indicator while the data behind it is changing; ignored in outline mode. */
  busy?: boolean;
  /** When true, renders the same forest as GenreTreeOutline's nested-list text view instead of
   * the radial wheel. Defaults to false. */
  outline?: boolean;
  /** Mount-only seed for the pan/zoom, replacing the initial fit. */
  defaultViewport?: GenreTreeViewport;
  /** Runtime viewport restoration request. */
  viewportRestore?: GenreTreeProps["viewportRestore"];
  /** Fires after a user-driven pan/zoom settles. */
  onViewportChange?: (viewport: GenreTreeViewport) => void;
  /** What node play buttons play; defaults to each node's whole genre playlist. */
  playback?: GenrePlaylistPlayback;
} & GenreFocusProps &
  HostPanelProps;

export default function GenrePlaylistTreeWheelRadialPopCore<T extends TrackBase>(
  props: GenrePlaylistTreeWheelRadialPopCoreProps<T>,
) {
  const {
    scope,
    className,
    genrePlaylists,
    handleGenreCreationAction,
    handleGenreRenameAction,
    additionalActions,
    onNodeClick,
    onNodeHover,
    selectedNodeId,
    onSelectedNodeChange,
    readOnly = false,
    allowWheelRotation,
    sizeMetric = "songs",
    floatingControlsLeading,
    busy,
    outline = false,
    defaultViewport,
    viewportRestore,
    onViewportChange,
    playback,
  } = props;
  const focus: GenreFocusProps = props;
  const hostPanel: HostPanelProps = {
    obscuredInset: props.obscuredInset,
    onNodeStyleResolverChange: props.onNodeStyleResolverChange,
  };
  const { isPlaying, setIsPlaying } = usePlayer();
  const defaultPlayback = useGenrePlaylistPlayback<T>({ scope, genrePlaylists });
  const { playing, play } = playback ?? defaultPlayback;
  const playingNodeId = playing?.uuid ?? null;

  const nodes = useMemo(() => toTreeNodes(genrePlaylists, sizeMetric), [genrePlaylists, sizeMetric]);

  const handlePlayPause = useCallback(
    (nodeId: string) => {
      const genrePlaylist = genrePlaylists.find((g) => g.uuid === nodeId);
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
      });
    },
    [genrePlaylists, playingNodeId, isPlaying, setIsPlaying, play],
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

  const treeProps = {
    className,
    nodes,
    playingNodeId,
    playState: isPlaying ? ("playing" as const) : ("paused" as const),
    onPlayPause: handlePlayPause,
    onAddChild: readOnly ? undefined : handleAddChild,
    onRenameRequest: readOnly ? undefined : handleRenameRequest,
    onDeleteRequest: readOnly ? undefined : handleDeleteRequest,
    additionalActions,
    onNodeClick,
    onNodeHover,
    selectedNodeId,
    onSelectedNodeChange,
    ...hostPanel,
  };

  return outline ? (
    <GenreTreeOutline {...treeProps} />
  ) : (
    <GenreTreeWheelRadialPopCore
      {...treeProps}
      allowWheelRotation={allowWheelRotation}
      floatingControlsLeading={floatingControlsLeading}
      busy={busy}
      defaultViewport={defaultViewport}
      viewportRestore={viewportRestore}
      onViewportChange={onViewportChange}
      {...(focus.onFocusGenreChange
        ? { focusNodeId: focus.focusGenreUuid, onFocusChange: focus.onFocusGenreChange }
        : { focusNodeId: undefined, onFocusChange: undefined })}
    />
  );
}
