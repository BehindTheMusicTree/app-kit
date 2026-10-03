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
import { GenreDetailExtras } from "./GenreDetailExtras";
import {
  getGenrePlaylistsGroupedByRoot,
  hasMainstreamPopRoot,
} from "./lib/genre-playlist-helpers";

import GenrePlaylistTreePerRoot from "./playlist-tree/TreePerRoot";
import GenrePlaylistTreeWheel from "./playlist-tree/TreeWheel";
import GenrePlaylistTreeWheelRadialPopCore from "./playlist-tree/TreeWheelRadialPopCore";
import { GenreTreeWheelHandoff } from "./GenreTreeWheelHandoff";
import GenreSearch from "./GenreSearch";

export type { ControlsOrientation, GenreTreeViewMode } from "@behindthemusictree/genre-tree-view";

const HOVER_PREFETCH_DELAY_MS = 100;

export type GenreTreeViewProps<O extends CriteriaOverview = CriteriaOverview> = {
  scope: Scope;
  handleGenreCreationAction: (parent: CriteriaMinimum | null) => void;
  handleGenreRenameAction: (genre: CriteriaMinimum) => void;
  getBackendBaseUrl: () => string;
  additionalActions?: (node: GenreTreeNode) => GenreTreeAction[];
  /** Controlled view mode. When provided, the internal Stacked/Wheel toggle is not rendered — the consumer owns that UI. */
  viewMode?: GenreTreeViewMode;
  /** When true, hides the "Add root" button and suppresses per-node
   * create/rename/reparent affordances, for a read-only consumer. Defaults to false. */
  readOnly?: boolean;
  /** Parses the selected genre's overview; pass an extended schema to keep consumer-specific fields. */
  criteriaOverviewSchema?: z.ZodType<O, z.ZodTypeDef, unknown>;
  /** Consumer-specific rows rendered in the info panel after Summary. */
  renderGenreDetailExtras?: (overview: O) => ReactNode;
  /** Layout of the wheel/tree floating zoom/pop/fit controls. Defaults to "vertical". */
  controlsOrientation?: ControlsOrientation;
};

export function GenreTreeView<O extends CriteriaOverview = CriteriaOverview>({
  scope,
  handleGenreCreationAction,
  handleGenreRenameAction,
  getBackendBaseUrl,
  additionalActions,
  viewMode: controlledViewMode,
  readOnly = false,
  criteriaOverviewSchema,
  renderGenreDetailExtras,
  controlsOrientation,
}: GenreTreeViewProps<O>) {
  const [reparentingGenreUuid, setReparentingGenreUuid] = useState<
    string | null
  >(null);
  const [internalViewMode, setInternalViewMode] =
    useState<GenreTreeViewMode>("pop-core");
  const isControlled = controlledViewMode !== undefined;
  const [allowWheelRotation, setAllowWheelRotation] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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
    [],
  );

  const handleGenreSearchClear = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleGenreSearchSelect = useCallback(
    (genrePlaylist: CriteriaPlaylistSimple) => {
      setSelectedNodeId(genrePlaylist.uuid);
    },
    [],
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
        />
      );
    },
    [genrePlaylistByNodeId, scope, getBackendBaseUrl, criteriaOverviewSchema, renderGenreDetailExtras],
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

  const actions = (
    <>
      {!isLoading && (
        <GenreSearch
          genrePlaylists={genrePlaylists ?? []}
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
          <Button
            variant={showToolbar ? "default" : "outline"}
            size="sm"
            onClick={() => setShowToolbar((prev) => !prev)}
          >
            Toolbar
          </Button>
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
                  genrePlaylists={
                    genrePlaylists ?? []
                  }
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
                  showToolbar={showToolbar}
                  controlsOrientation={controlsOrientation}
                />
              </GenreTreeWheelHandoff>
            </div>
          ) : viewMode === "pop-core" ? (
            // Search bar is h-10 at top-3: 12px + 40px + 8px gap puts the info panel just below it.
            <div className="tree-container relative flex-1 w-full min-h-0 [--gtv-info-panel-top:60px]">
              <GenreTreeWheelHandoff skeleton={<GenreTreeWheelSkeleton />}>
                <GenrePlaylistTreeWheelRadialPopCore
                  scope={scope}
                  // Non-null assertion, not `?? []`: reaching this branch requires canShowPopCore
                  // to be true, which the useMemo above only sets once genrePlaylists is a
                  // defined array containing a "Mainstream Pop" root, so it can't be nullish here —
                  // asserting it fails loudly instead of silently passing undefined if that
                  // invariant ever regresses.
                  genrePlaylists={genrePlaylists!}
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
                  showToolbar={showToolbar}
                  controlsOrientation={controlsOrientation}
                />
              </GenreTreeWheelHandoff>
            </div>
          ) : viewMode === "outline" ? (
            <div className="tree-container flex-1 min-h-0 w-full overflow-y-auto relative pt-16">
              <GenrePlaylistTreeWheelRadialPopCore
                outline
                scope={scope}
                // Non-null assertion: same canShowPopCore invariant as the pop-core branch above.
                genrePlaylists={genrePlaylists!}
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
                showToolbar={showToolbar}
              />
            </div>
          ) : (
            <div className="tree-container relative flex flex-col gap-4 w-full pt-14 overflow-x-auto overflow-y-auto text-gray-800">
              {Object.entries(groupedGenrePlaylistsByRoot).map(
                ([uuid, genrePlaylistTreePerRoot]) => {
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
                          showToolbar={showToolbar}
                          wheelZoom="modifier"
                          controlsOrientation={controlsOrientation}
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
