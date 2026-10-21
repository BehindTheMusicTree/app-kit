"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import {
  GenreTreeOutline,
  GenreTreeWheelRadialPopCore,
  type ControlsOrientation,
  type FocusChangeReason,
  type GenreTreeAction,
  type GenreTreeNode,
} from "@behindthemusictree/genre-tree-view";

import { useTrackList } from "@behindthemusictree/app-kit/genre-tree";
import { useUpdateGenre } from "@behindthemusictree/app-kit/genre-tree";
import { usePlayer } from "@behindthemusictree/app-kit/player";

import { TrackListOriginType } from "@behindthemusictree/app-kit/genre-tree";
import { TrackBase } from "@behindthemusictree/app-kit/genre-tree";

import { CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";
import { CriteriaMinimum } from "@behindthemusictree/app-kit/genre-tree";
import { Scope } from "@behindthemusictree/app-kit/transport";
import type { InfoPanelCurationProps } from "./infoPanelCurationProps";

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
  /** Fires when a user action changes the info panel's node, or `null` when it is closed. */
  onSelectedNodeChange?: (node: GenreTreeNode | null) => void;
  /** Hides the info panel's header close button. */
  hideInfoPanelClose?: boolean;
  /** When true, suppresses per-node create/rename/reparent affordances. Defaults to false. */
  readOnly?: boolean;
  /** When false, clicking a chip still selects its root, but the ring doesn't spin to the
   * landing angle. Defaults to true. */
  allowWheelRotation?: boolean;
  /** When false, suppresses the hover toolbar on every node. Defaults to true. */
  showToolbar?: boolean;
  /** Layout of the wheel's floating zoom/pop/fit controls; ignored in outline mode. Defaults to
   * "vertical". */
  controlsOrientation?: ControlsOrientation;
  /** When true, renders the same forest as GenreTreeOutline's nested-list text view instead of
   * the radial wheel. Defaults to false. */
  outline?: boolean;
} & GenreFocusProps &
  InfoPanelCurationProps;

export default function GenrePlaylistTreeWheelRadialPopCore<T extends TrackBase>(
  props: GenrePlaylistTreeWheelRadialPopCoreProps<T>,
) {
  const {
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
    onSelectedNodeChange,
    hideInfoPanelClose,
    readOnly = false,
    allowWheelRotation,
    showToolbar,
    controlsOrientation,
    outline = false,
  } = props;
  const focus: GenreFocusProps = props;
  const infoPanelCuration: InfoPanelCurationProps = {
    editMode: props.editMode,
    onEditModeChange: props.onEditModeChange,
    renderTitleEditor: props.renderTitleEditor,
    renderParentsEditor: props.renderParentsEditor,
    renderDangerZone: props.renderDangerZone,
    expanded: props.expanded,
    onExpandedChange: props.onExpandedChange,
    overlayPanel: props.overlayPanel,
  };
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
        detached: !genrePlaylist.criteria,
        side: genrePlaylist.criteria?.side ?? undefined,
        wikidataId: genrePlaylist.criteria?.wikidataId ?? null,
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
    onSelectedNodeChange,
    hideInfoPanelClose,
    showToolbar,
    ...infoPanelCuration,
    readOnly,
  };

  return outline ? (
    <GenreTreeOutline {...treeProps} />
  ) : (
    <GenreTreeWheelRadialPopCore
      {...treeProps}
      allowWheelRotation={allowWheelRotation}
      controlsOrientation={controlsOrientation}
      {...(focus.onFocusGenreChange
        ? { focusNodeId: focus.focusGenreUuid, onFocusChange: focus.onFocusGenreChange }
        : { focusNodeId: undefined, onFocusChange: undefined })}
    />
  );
}
