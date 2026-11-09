"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Scope } from "../transport/lib/scope";
import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";
import { GenreUuid } from "./schemas/ids";
import { CriteriaOverview } from "./schemas/criteria/overview";
import { usePrefetchGenreOverview } from "./useGenre";
import { useVisibleGenrePlaylists } from "./useVisibleGenrePlaylists";
import { getGenrePlaylistsGroupedByRoot, hasMainstreamPopRoot } from "./lib/genre-playlist-helpers";

export type GenreViewMode = "stacked" | "wheel" | "pop-core" | "outline";

const HOVER_PREFETCH_DELAY_MS = 100;

const needsPopCore = (mode: GenreViewMode) => mode === "pop-core" || mode === "outline";

export interface UseGenreTreeViewStateOptions<O extends CriteriaOverview = CriteriaOverview> {
  scope: Scope;
  getBackendBaseUrl: () => string;
  /** Controlled view mode; when provided the hook never changes it. */
  viewMode?: GenreViewMode;
  /** Narrows the tree to this artist's footprint (see `useVisibleGenrePlaylists`). */
  artistUuid?: string | null;
  /** Entity selection is independent of the visible renderer nodes. */
  selectedGenreUuid?: GenreUuid | null;
  onSelectedGenreUuidChange?: (genreUuid: GenreUuid | null) => void;
  criteriaOverviewSchema?: z.ZodType<O, unknown>;
}

export interface UseGenreTreeViewStateResult {
  isLoading: boolean;
  /** The tree failed to load and nothing is cached. `genrePlaylists` is empty, which is not "no genres". */
  isError: boolean;
  refetch: () => void;
  /** True while the visible tree is being refreshed or re-pruned; the previous tree stays in `genrePlaylists`. */
  isFetching: boolean;
  genrePlaylists: CriteriaPlaylistSimple[];
  genrePlaylistByNodeId: Map<string, CriteriaPlaylistSimple>;
  /** Playlists the current view mode may show: unaccepted roots and, outside stacked/outline, criteria-less playlists are hidden. */
  visibleGenrePlaylists: CriteriaPlaylistSimple[];
  groupedGenrePlaylistsByRoot: Record<string, CriteriaPlaylistSimple[]>;
  selectedGenreUuid: GenreUuid | null;
  selectedNodeId: string | null;
  selectGenre: (genreUuid: GenreUuid | null) => void;
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
  /** Moves the genre under a new parent. */
  /** Prefetches the hovered genre's overview once the pointer has rested briefly. */
  onNodeHover: (node: { id: string }) => void;
}

export function useGenreTreeViewState<O extends CriteriaOverview = CriteriaOverview>({
  scope,
  getBackendBaseUrl,
  viewMode: controlledViewMode,
  artistUuid,
  selectedGenreUuid: controlledSelectedGenreUuid,
  onSelectedGenreUuidChange,
  criteriaOverviewSchema,
}: UseGenreTreeViewStateOptions<O>): UseGenreTreeViewStateResult {
  const [internalViewMode, setInternalViewMode] = useState<GenreViewMode>("pop-core");
  const [allowWheelRotation, setAllowWheelRotation] = useState(false);
  const [internalSelectedGenreUuid, setInternalSelectedGenreUuid] = useState<GenreUuid | null>(null);

  const isSelectionControlled = controlledSelectedGenreUuid !== undefined;
  const selectedGenreUuid = isSelectionControlled ? controlledSelectedGenreUuid : internalSelectedGenreUuid;
  const selectGenre = useCallback(
    (nodeId: GenreUuid | null) => {
      if (!isSelectionControlled) setInternalSelectedGenreUuid(nodeId);
      onSelectedGenreUuidChange?.(nodeId);
    },
    [isSelectionControlled, onSelectedGenreUuidChange],
  );

  const { isLoading, isError, refetch, isFetching, genrePlaylists } = useVisibleGenrePlaylists({ scope, getBackendBaseUrl, artistUuid });

  const genrePlaylistByNodeId = useMemo(() => new Map<string, CriteriaPlaylistSimple>(genrePlaylists.map((gp) => [gp.uuid, gp])), [genrePlaylists]);

  const selectedGenrePlaylist = useMemo(
    () => genrePlaylists.find((gp) => gp.criteria?.uuid === selectedGenreUuid),
    [genrePlaylists, selectedGenreUuid],
  );
  const selectedNodeId = selectedGenrePlaylist?.uuid ?? null;
  const selectNode = useCallback((node: { id: string } | null) => {
    if (!node) selectGenre(null);
    else {
      const genreUuid = genrePlaylistByNodeId.get(node.id)?.criteria?.uuid;
      if (genreUuid) selectGenre(genreUuid);
    }
  }, [selectGenre, genrePlaylistByNodeId]);
  const clearSelection = useCallback(() => selectGenre(null), [selectGenre]);
  const selectGenrePlaylist = useCallback((playlist: CriteriaPlaylistSimple) => {
    if (playlist.criteria) selectGenre(playlist.criteria.uuid);
  }, [selectGenre]);

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
    if (!isLoading && !isError && needsPopCore(internalViewMode) && !canShowPopCore) {
      setInternalViewMode("wheel");
    }
  }, [isLoading, isError, canShowPopCore, internalViewMode]);

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
    isError,
    refetch: () => void refetch(),
    isFetching,
    genrePlaylists,
    genrePlaylistByNodeId,
    visibleGenrePlaylists,
    groupedGenrePlaylistsByRoot,
    selectedGenreUuid,
    selectGenre,
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
    onNodeHover,
  };
}
