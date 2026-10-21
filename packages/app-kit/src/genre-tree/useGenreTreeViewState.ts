"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Scope } from "../transport/lib/scope";
import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";
import { CriteriaOverview } from "./schemas/criteria/overview";
import { usePrefetchGenreOverview } from "./useGenre";
import { useListFullGenrePlaylists } from "./useGenrePlaylist";
import { getGenrePlaylistsGroupedByRoot, hasMainstreamPopRoot } from "./lib/genre-playlist-helpers";

export type GenreViewMode = "stacked" | "wheel" | "pop-core" | "outline";

const HOVER_PREFETCH_DELAY_MS = 100;

const needsPopCore = (mode: GenreViewMode) => mode === "pop-core" || mode === "outline";

export interface UseGenreTreeViewStateOptions<O extends CriteriaOverview = CriteriaOverview> {
  scope: Scope;
  getBackendBaseUrl: () => string;
  /** Controlled view mode; when provided the hook never changes it. */
  viewMode?: GenreViewMode;
  /** Controlled selection (a genre playlist uuid, i.e. the tree node id). */
  selectedNodeId?: string | null;
  /** Called on every user-driven selection change (node click, search pick, search clear). */
  onSelectedNodeIdChange?: (nodeId: string | null) => void;
  criteriaOverviewSchema?: z.ZodType<O, z.ZodTypeDef, unknown>;
}

export interface UseGenreTreeViewStateResult {
  isLoading: boolean;
  genrePlaylists: CriteriaPlaylistSimple[];
  genrePlaylistByNodeId: Map<string, CriteriaPlaylistSimple>;
  /** Playlists the current view mode may show: unaccepted roots and, outside stacked/outline, criteria-less playlists are hidden. */
  visibleGenrePlaylists: CriteriaPlaylistSimple[];
  groupedGenrePlaylistsByRoot: Record<string, CriteriaPlaylistSimple[]>;
  selectedNodeId: string | null;
  selectedGenrePlaylist: CriteriaPlaylistSimple | undefined;
  selectNode: (node: { id: string } | null) => void;
  selectGenrePlaylist: (genrePlaylist: CriteriaPlaylistSimple) => void;
  clearSelection: () => void;
  /** The effective view mode: falls back to "wheel" when a pop-core-based mode has no "Mainstream Pop" root. */
  viewMode: GenreViewMode;
  isViewModeControlled: boolean;
  setViewMode: (mode: GenreViewMode) => void;
  canShowPopCore: boolean;
  allowWheelRotation: boolean;
  toggleWheelRotation: () => void;
  reparentingGenreUuid: string | null;
  setReparentingGenreUuid: (genreUuid: string | null) => void;
  /** Prefetches the hovered genre's overview once the pointer has rested briefly. */
  onNodeHover: (node: { id: string }) => void;
}

export function useGenreTreeViewState<O extends CriteriaOverview = CriteriaOverview>({
  scope,
  getBackendBaseUrl,
  viewMode: controlledViewMode,
  selectedNodeId: controlledSelectedNodeId,
  onSelectedNodeIdChange,
  criteriaOverviewSchema,
}: UseGenreTreeViewStateOptions<O>): UseGenreTreeViewStateResult {
  const [reparentingGenreUuid, setReparentingGenreUuid] = useState<string | null>(null);
  const [internalViewMode, setInternalViewMode] = useState<GenreViewMode>("pop-core");
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

  const { data, isPending: isLoading } = useListFullGenrePlaylists(scope, getBackendBaseUrl);
  const genrePlaylists = useMemo(() => data ?? [], [data]);

  const genrePlaylistByNodeId = useMemo(() => new Map(genrePlaylists.map((gp) => [gp.uuid, gp])), [genrePlaylists]);

  const selectedGenrePlaylist = useMemo(
    () => genrePlaylists.find((gp) => gp.uuid === selectedNodeId),
    [genrePlaylists, selectedNodeId],
  );

  const selectNode = useCallback((node: { id: string } | null) => setSelectedNodeId(node?.id ?? null), [setSelectedNodeId]);
  const clearSelection = useCallback(() => setSelectedNodeId(null), [setSelectedNodeId]);
  const selectGenrePlaylist = useCallback(
    (genrePlaylist: CriteriaPlaylistSimple) => setSelectedNodeId(genrePlaylist.uuid),
    [setSelectedNodeId],
  );

  const prefetchGenreOverview = usePrefetchGenreOverview<O>(scope, getBackendBaseUrl, criteriaOverviewSchema);
  const hoverPrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (hoverPrefetchTimerRef.current) clearTimeout(hoverPrefetchTimerRef.current);
    },
    [],
  );
  // Prefetch only after the pointer rests briefly, so sweeping across rows doesn't fire a request per row.
  const onNodeHover = useCallback(
    (node: { id: string }) => {
      if (hoverPrefetchTimerRef.current) clearTimeout(hoverPrefetchTimerRef.current);
      const genreUuid = genrePlaylistByNodeId.get(node.id)?.criteria?.uuid;
      if (!genreUuid) return;
      hoverPrefetchTimerRef.current = setTimeout(() => {
        void prefetchGenreOverview(genreUuid);
      }, HOVER_PREFETCH_DELAY_MS);
    },
    [genrePlaylistByNodeId, prefetchGenreOverview],
  );

  const groupedGenrePlaylistsByRoot = useMemo(() => getGenrePlaylistsGroupedByRoot(genrePlaylists), [genrePlaylists]);

  const canShowPopCore = useMemo(
    () =>
      hasMainstreamPopRoot(
        genrePlaylists.map((genrePlaylist) => ({
          parentId: genrePlaylist.parent?.uuid ?? null,
          name: genrePlaylist.name,
        })),
      ),
    [genrePlaylists],
  );

  useEffect(() => {
    if (!isLoading && needsPopCore(internalViewMode) && !canShowPopCore) {
      setInternalViewMode("wheel");
    }
  }, [isLoading, canShowPopCore, internalViewMode]);

  // Mirrors the effect above, but applied synchronously in the render path: the effect alone
  // can't stop a "pop-core" render from mounting the pop-core wheel on data with no "Mainstream
  // Pop" root, since effects only run after that render already committed — and that component
  // throws on mount when the root is missing, so the fallback would fire too late.
  const selectedViewMode = controlledViewMode ?? internalViewMode;
  const viewMode = needsPopCore(selectedViewMode) && !canShowPopCore ? "wheel" : selectedViewMode;

  // Unaccepted roots (and their subtrees) stay hidden until an admin accepts them; only the
  // stacked view shows everything. The wheels also have no place for criteria-less playlists
  // (Genreless), which outline lists apart.
  const visibleGenrePlaylists = useMemo(() => {
    if (viewMode === "stacked") return genrePlaylists;
    const unacceptedRootUuids = new Set(genrePlaylists.filter((gp) => gp.isUnacceptedRoot).map((gp) => gp.uuid));
    const accepted = genrePlaylists.filter((gp) => !gp.isUnacceptedRoot && !unacceptedRootUuids.has(gp.root.uuid));
    return viewMode === "outline" ? accepted : accepted.filter((gp) => gp.criteria);
  }, [genrePlaylists, viewMode]);

  return {
    isLoading,
    genrePlaylists,
    genrePlaylistByNodeId,
    visibleGenrePlaylists,
    groupedGenrePlaylistsByRoot,
    selectedNodeId,
    selectedGenrePlaylist,
    selectNode,
    selectGenrePlaylist,
    clearSelection,
    viewMode,
    isViewModeControlled: controlledViewMode !== undefined,
    setViewMode: setInternalViewMode,
    canShowPopCore,
    allowWheelRotation,
    toggleWheelRotation: () => setAllowWheelRotation((prev) => !prev),
    reparentingGenreUuid,
    setReparentingGenreUuid,
    onNodeHover,
  };
}
