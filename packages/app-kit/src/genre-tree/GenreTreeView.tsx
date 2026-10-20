"use client";

import { useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from "react";
import { z } from "zod";
import { Plus } from "lucide-react";
import { IconTextButton, Button } from "@behindthemusictree/ui";

import {
  GenreTreeWheelSkeleton,
  GenreTreeViewSkeleton,
} from "@behindthemusictree/genre-tree-view";
import type {
  ControlsOrientation,
  GenreTreeAction,
  GenreTreeNode,
  GenreTreeViewMode,
} from "@behindthemusictree/genre-tree-view";

import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";
import { CriteriaMinimum } from "./schemas/criteria/minimum";
import { CriteriaOverview } from "./schemas/criteria/overview";
import { Scope } from "../transport/lib/scope";
import { useListFullGenrePlaylists } from "./useGenrePlaylist";
import { usePrefetchGenreOverview } from "./useGenre";
import { GenreDetailExtras, type GenreDetailSlots } from "./GenreDetailExtras";
import type { GenrePlaylistTracksSlots } from "./GenrePlaylistTracks";
import type { InfoPanelCurationProps } from "./playlist-tree/infoPanelCurationProps";
import type { RenderArtistLink } from "./ArtistNames";
import {
  getGenrePlaylistsGroupedByRoot,
  hasMainstreamPopRoot,
} from "./lib/genre-playlist-helpers";

import GenrePlaylistTreePerRoot from "./playlist-tree/TreePerRoot";
import GenrePlaylistTreeWheel from "./playlist-tree/TreeWheel";
import GenrePlaylistTreeWheelRadialPopCore, { type GenreFocusProps } from "./playlist-tree/TreeWheelRadialPopCore";
import { GenreTreeWheelHandoff } from "./GenreTreeWheelHandoff";
import GenreSearch from "./GenreSearch";

export type {
  ControlsOrientation,
  FocusChangeReason,
  GenreTreeViewMode,
} from "@behindthemusictree/genre-tree-view";
export type { GenreFocusProps } from "./playlist-tree/TreeWheelRadialPopCore";

const HOVER_PREFETCH_DELAY_MS = 100;

export type GenreTreeViewProps<O extends CriteriaOverview = CriteriaOverview> = {
  scope: Scope;
  handleGenreCreationAction: (parent: CriteriaMinimum | null) => void;
  handleGenreRenameAction: (genre: CriteriaMinimum) => void;
  getBackendBaseUrl: () => string;
  additionalActions?: (node: GenreTreeNode) => GenreTreeAction[];
  /** Controlled view mode. When provided, the internal Stacked/Wheel toggle is not rendered — the consumer owns that UI. */
  viewMode?: GenreTreeViewMode;
  /** Controlled selection (a genre playlist uuid, i.e. the tree node id). When provided, the
   * consumer owns it — e.g. to move the selection after deleting the selected genre. */
  selectedNodeId?: string | null;
  /** Called on every user-driven selection change (tree click, search pick, search clear). */
  onSelectedNodeIdChange?: (nodeId: string | null) => void;
  /** When true, hides the "Add root" button and suppresses per-node
   * create/rename/reparent affordances, for a read-only consumer. Defaults to false. */
  readOnly?: boolean;
  /** Parses the selected genre's overview; pass an extended schema to keep consumer-specific fields. */
  criteriaOverviewSchema?: z.ZodType<O, z.ZodTypeDef, unknown>;
  /** Consumer-specific rows rendered in the info panel after Summary. */
  renderGenreDetailExtras?: (overview: O) => ReactNode;
  /** Layout of the wheel/tree floating zoom/pop/fit controls. Defaults to "vertical". */
  controlsOrientation?: ControlsOrientation;
  /** When set, artist names in the info panel's track list render through it (e.g. a router `Link`). */
  renderArtistLink?: RenderArtistLink;
} & GenreDetailSlots<O> &
  GenrePlaylistTracksSlots &
  InfoPanelCurationProps &
  GenreFocusProps;

export function GenreTreeView<O extends CriteriaOverview = CriteriaOverview>({
  scope,
  handleGenreCreationAction,
  handleGenreRenameAction,
  getBackendBaseUrl,
  additionalActions,
  viewMode: controlledViewMode,
  selectedNodeId: controlledSelectedNodeId,
  onSelectedNodeIdChange,
  readOnly = false,
  criteriaOverviewSchema,
  renderGenreDetailExtras,
  controlsOrientation,
  renderArtistLink,
  renderSummary,
  renderEssentialTracks,
  renderRecordingLeading,
  renderRecordingActions,
  renderTracksToolbar,
  editMode,
  onEditModeChange,
  renderTitleEditor,
  renderParentsEditor,
  renderDangerZone,
  expanded,
  onExpandedChange,
  overlayPanel,
  ...focus
}: GenreTreeViewProps<O>) {
  const infoPanelCuration: InfoPanelCurationProps = {
    editMode,
    onEditModeChange,
    renderTitleEditor,
    renderParentsEditor,
    renderDangerZone,
    expanded,
    onExpandedChange,
    overlayPanel,
  };
  const [reparentingGenreUuid, setReparentingGenreUuid] = useState<
    string | null
  >(null);
  const [internalViewMode, setInternalViewMode] =
    useState<GenreTreeViewMode>("pop-core");
  const isControlled = controlledViewMode !== undefined;
  const [allowWheelRotation, setAllowWheelRotation] = useState(false);

  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(null);
  const isSelectionControlled = controlledSelectedNodeId !== undefined;
  const selectedNodeId = isSelectionControlled ? controlledSelectedNodeId : internalSelectedNodeId;
  const setSelectedNodeId = useCallback(
    (nodeId: string | null) => {
      if (!isSelectionControlled) setInternalSelectedNodeId(nodeId);
      onSelectedNodeIdChange?.(nodeId);
    },
    [isSelectionControlled, onSelectedNodeIdChange],
  );

  const { data: genrePlaylists, isPending: isListingGenrePlaylists } =
    useListFullGenrePlaylists(scope, getBackendBaseUrl);

  const genrePlaylistByNodeId = useMemo(
    () =>
      new Map(
        (genrePlaylists ?? []).map(
          (gp) => [gp.uuid, gp],
        ),
      ),
    [genrePlaylists],
  );

  const selectedGenrePlaylist = useMemo(
    () =>
      (genrePlaylists ?? []).find(
        (gp) => gp.uuid === selectedNodeId,
      ),
    [genrePlaylists, selectedNodeId],
  );

  const handleSelectedNodeChange = useCallback(
    (node: GenreTreeNode | null) => {
      setSelectedNodeId(node?.id ?? null);
    },
    [setSelectedNodeId],
  );

  const handleGenreSearchClear = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const handleGenreSearchSelect = useCallback(
    (genrePlaylist: CriteriaPlaylistSimple) => {
      setSelectedNodeId(genrePlaylist.uuid);
    },
    [setSelectedNodeId],
  );

  // Stable across selections: the overview fetch lives in GenreDetailExtras, so its loading
  // states re-render only the info panel, never the tree.
  const renderExtraDetails = useCallback(
    (node: GenreTreeNode): ReactNode => {
      const genrePlaylist = genrePlaylistByNodeId.get(node.id);
      const genreUuid = genrePlaylist?.criteria?.uuid;
      if (!genrePlaylist || !genreUuid) return null;
      return (
        <GenreDetailExtras<O>
          key={genreUuid}
          genreUuid={genreUuid}
          genrePlaylist={genrePlaylist}
          scope={scope}
          getBackendBaseUrl={getBackendBaseUrl}
          criteriaOverviewSchema={criteriaOverviewSchema}
          renderGenreDetailExtras={renderGenreDetailExtras}
          renderArtistLink={renderArtistLink}
          renderSummary={renderSummary}
          renderEssentialTracks={renderEssentialTracks}
          renderRecordingLeading={renderRecordingLeading}
          renderRecordingActions={renderRecordingActions}
          renderTracksToolbar={renderTracksToolbar}
        />
      );
    },
    [genrePlaylistByNodeId, scope, getBackendBaseUrl, criteriaOverviewSchema,
      renderGenreDetailExtras,
      renderArtistLink,
      renderSummary,
      renderEssentialTracks,
      renderRecordingLeading,
      renderRecordingActions,
      renderTracksToolbar,
    ],
  );

  const prefetchGenreOverview = usePrefetchGenreOverview<O>(
    scope,
    getBackendBaseUrl,
    criteriaOverviewSchema,
  );
  const hoverPrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (hoverPrefetchTimerRef.current) clearTimeout(hoverPrefetchTimerRef.current);
  }, []);
  // Prefetch only after the pointer rests briefly, so sweeping across rows doesn't fire a request per row.
  const handleNodeHover = useCallback(
    (node: GenreTreeNode) => {
      if (hoverPrefetchTimerRef.current) clearTimeout(hoverPrefetchTimerRef.current);
      const genreUuid = genrePlaylistByNodeId.get(node.id)?.criteria?.uuid;
      if (!genreUuid) return;
      hoverPrefetchTimerRef.current = setTimeout(() => {
        void prefetchGenreOverview(genreUuid);
      }, HOVER_PREFETCH_DELAY_MS);
    },
    [genrePlaylistByNodeId, prefetchGenreOverview],
  );

  const groupedGenrePlaylistsByRoot = useMemo(
    () =>
      genrePlaylists ? getGenrePlaylistsGroupedByRoot(genrePlaylists) : {},
    [genrePlaylists],
  );

  const isLoading = isListingGenrePlaylists;

  const canShowPopCore = useMemo(
    () =>
      hasMainstreamPopRoot(
        (genrePlaylists ?? []).map((genrePlaylist) => ({
          id: genrePlaylist.uuid,
          parentId: genrePlaylist.parent?.uuid ?? null,
          name: genrePlaylist.name,
          itemCount: genrePlaylist.tracksCount,
        })),
      ),
    [genrePlaylists],
  );

  // "outline" is GenreTreeOutline, which shares pop-core's "Mainstream Pop" requirement.
  const needsPopCore = (mode: GenreTreeViewMode) =>
    mode === "pop-core" || mode === "outline";

  useEffect(() => {
    if (!isLoading && needsPopCore(internalViewMode) && !canShowPopCore) {
      setInternalViewMode("wheel");
    }
  }, [isLoading, canShowPopCore, internalViewMode]);

  // Mirrors the effect above, but applied synchronously in the render path: the effect alone
  // can't stop a "pop-core" render from mounting GenrePlaylistTreeWheelRadialPopCore on data
  // with no "Mainstream Pop" root, since effects only run after that render already committed —
  // and that component throws on mount when the root is missing, so the fallback would fire too
  // late to prevent the crash.
  const selectedViewMode = controlledViewMode ?? internalViewMode;
  const viewMode =
    needsPopCore(selectedViewMode) && !canShowPopCore
      ? "wheel"
      : selectedViewMode;

  // Unaccepted roots (and their subtrees) stay hidden until an admin accepts them; only the
  // stacked view shows everything. The wheels also have no place for criteria-less playlists
  // (Genreless), which outline lists apart.
  const visibleGenrePlaylists = useMemo(() => {
    const all = genrePlaylists ?? [];
    if (viewMode === "stacked") return all;
    const unacceptedRootUuids = new Set(all.filter((gp) => gp.isUnacceptedRoot).map((gp) => gp.uuid));
    const accepted = all.filter(
      (gp) => !gp.isUnacceptedRoot && !unacceptedRootUuids.has(gp.root.uuid),
    );
    return viewMode === "outline" ? accepted : accepted.filter((gp) => gp.criteria);
  }, [genrePlaylists, viewMode]);

  const actions = (
    <>
      {!isLoading && (
        <GenreSearch
          genrePlaylists={visibleGenrePlaylists}
          onSelect={handleGenreSearchSelect}
          selectedName={selectedGenrePlaylist?.name ?? null}
          onClear={handleGenreSearchClear}
        />
      )}
      {!isLoading && !isControlled && (
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Tree view mode"
        >
          <Button
            variant={viewMode === "pop-core" ? "default" : "outline"}
            size="sm"
            disabled={!canShowPopCore}
            title={
              canShowPopCore
                ? undefined
                : "This genre tree has no 'Mainstream Pop' root yet"
            }
            onClick={() => setInternalViewMode("pop-core")}
          >
            Pop/Core
          </Button>
          <Button
            variant={viewMode === "wheel" ? "default" : "outline"}
            size="sm"
            onClick={() => setInternalViewMode("wheel")}
          >
            Wheel
          </Button>
          <Button
            variant={viewMode === "stacked" ? "default" : "outline"}
            size="sm"
            onClick={() => setInternalViewMode("stacked")}
          >
            Stacked
          </Button>
          <Button
            variant={viewMode === "outline" ? "default" : "outline"}
            size="sm"
            disabled={!canShowPopCore}
            title={
              canShowPopCore
                ? undefined
                : "This genre tree has no 'Mainstream Pop' root yet"
            }
            onClick={() => setInternalViewMode("outline")}
          >
            Outline
          </Button>
        </div>
      )}
      {!isLoading && (
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Tree display options"
        >
          {viewMode !== "stacked" && viewMode !== "outline" && (
            <Button
              variant={allowWheelRotation ? "default" : "outline"}
              size="sm"
              onClick={() => setAllowWheelRotation((prev) => !prev)}
            >
              Rotation
            </Button>
          )}
        </div>
      )}
      {!isLoading && !readOnly && (
        <IconTextButton
          icon={Plus}
          text="Add root"
          onClick={() => handleGenreCreationAction(null)}
        />
      )}
    </>
  );

  return (
    <div className="relative flex flex-col h-full">
      <div className="actions-container absolute left-3 top-3 z-30 flex items-center gap-2">
        {actions}
      </div>
      <div className="content-container flex-1 min-h-0 flex flex-row gap-4">
        <div className="tree-view-container flex-1 min-w-0 flex flex-col h-full">
          {isLoading ? (
            <GenreTreeViewSkeleton viewMode={viewMode} />
          ) : viewMode === "wheel" ? (
            // Search bar is h-10 at top-3: 12px + 40px + 8px gap puts the info panel just below it.
            <div className="tree-container relative flex-1 w-full min-h-0 [--gtv-info-panel-top:60px]">
              <GenreTreeWheelHandoff skeleton={<GenreTreeWheelSkeleton />}>
                <GenrePlaylistTreeWheel
                  scope={scope}
                  genrePlaylists={visibleGenrePlaylists}
                  reparentingGenreUuid={reparentingGenreUuid}
                  setReparentingGenreUuid={setReparentingGenreUuid}
                  handleGenreCreationAction={handleGenreCreationAction}
                  handleGenreRenameAction={handleGenreRenameAction}
                  getBackendBaseUrl={getBackendBaseUrl}
                  additionalActions={additionalActions}
                  onSelectedNodeChange={handleSelectedNodeChange}
                  hideInfoPanelClose
                  onNodeHover={handleNodeHover}
                  renderExtraDetails={renderExtraDetails}
                  selectedNodeId={selectedNodeId}
                  readOnly={readOnly}
                  allowWheelRotation={allowWheelRotation}
                  controlsOrientation={controlsOrientation}
                  {...infoPanelCuration}
                />
              </GenreTreeWheelHandoff>
            </div>
          ) : viewMode === "pop-core" ? (
            // Search bar is h-10 at top-3: 12px + 40px + 8px gap puts the info panel just below it.
            <div className="tree-container relative flex-1 w-full min-h-0 [--gtv-info-panel-top:60px]">
              <GenreTreeWheelHandoff skeleton={<GenreTreeWheelSkeleton />}>
                <GenrePlaylistTreeWheelRadialPopCore
                  scope={scope}
                  genrePlaylists={visibleGenrePlaylists}
                  reparentingGenreUuid={reparentingGenreUuid}
                  setReparentingGenreUuid={setReparentingGenreUuid}
                  handleGenreCreationAction={handleGenreCreationAction}
                  handleGenreRenameAction={handleGenreRenameAction}
                  getBackendBaseUrl={getBackendBaseUrl}
                  additionalActions={additionalActions}
                  onSelectedNodeChange={handleSelectedNodeChange}
                  hideInfoPanelClose
                  onNodeHover={handleNodeHover}
                  renderExtraDetails={renderExtraDetails}
                  selectedNodeId={selectedNodeId}
                  readOnly={readOnly}
                  allowWheelRotation={allowWheelRotation}
                  controlsOrientation={controlsOrientation}
                  {...infoPanelCuration}
                  {...focus}
                />
              </GenreTreeWheelHandoff>
            </div>
          ) : viewMode === "outline" ? (
            <div className="tree-container flex-1 min-h-0 w-full overflow-y-auto relative pt-16">
              <GenrePlaylistTreeWheelRadialPopCore
                outline
                scope={scope}
                genrePlaylists={visibleGenrePlaylists}
                reparentingGenreUuid={reparentingGenreUuid}
                setReparentingGenreUuid={setReparentingGenreUuid}
                handleGenreCreationAction={handleGenreCreationAction}
                handleGenreRenameAction={handleGenreRenameAction}
                getBackendBaseUrl={getBackendBaseUrl}
                additionalActions={additionalActions}
                onSelectedNodeChange={handleSelectedNodeChange}
                hideInfoPanelClose
                onNodeHover={handleNodeHover}
                renderExtraDetails={renderExtraDetails}
                selectedNodeId={selectedNodeId}
                readOnly={readOnly}
                {...infoPanelCuration}
              />
            </div>
          ) : (
            <div className="tree-container relative flex flex-col gap-4 w-full pt-14 overflow-x-auto overflow-y-auto text-gray-800">
              {Object.entries(groupedGenrePlaylistsByRoot).map(
                ([uuid, genrePlaylistTreePerRoot], rootIndex) => {
                  return (
                    <div
                      key={uuid}
                      className="tree-per-root-container relative shrink-0 h-[28rem] mt-2 mr-16 p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="graph-container relative z-10 h-full">
                        <GenrePlaylistTreePerRoot
                          scope={scope}
                          rootUuid={uuid}
                          genrePlaylistTreePerRoot={genrePlaylistTreePerRoot}
                          reparentingGenreUuid={reparentingGenreUuid}
                          setReparentingGenreUuid={setReparentingGenreUuid}
                          handleGenreCreationAction={handleGenreCreationAction}
                          handleGenreRenameAction={handleGenreRenameAction}
                          getBackendBaseUrl={getBackendBaseUrl}
                          additionalActions={additionalActions}
                          onSelectedNodeChange={handleSelectedNodeChange}
                          hideInfoPanelClose
                          onNodeHover={handleNodeHover}
                          renderExtraDetails={renderExtraDetails}
                          // Each root has its own panel; null closes the one not holding the selection.
                          selectedNodeId={
                            uuid === selectedGenrePlaylist?.root.uuid ? selectedNodeId : null
                          }
                          readOnly={readOnly}
                          wheelZoom="modifier"
                          controlsOrientation={controlsOrientation}
                          {...infoPanelCuration}
                          // Every tree draws its own overlay; render it once, not per root.
                          overlayPanel={rootIndex === 0 ? overlayPanel : undefined}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
