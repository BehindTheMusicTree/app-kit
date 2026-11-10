"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Maximize2, Minimize2 } from "lucide-react";
import { IconTextButton, IconButton, Button, SegmentedControl, DetailPanel, useObscuredInset } from "@behindthemusictree/ui";

import {
  GenreTreeWheelSkeleton,
  GenreTreeViewSkeleton,
  useGenreNodeRelations,
} from "@behindthemusictree/genre-tree-view";
import type {
  GenreTreeAction,
  GenreTreeNode,
  GenreTreeViewMode,
  GenreTreeViewport,
  GenreTreeProps,
  GenreNodeStyleResolver,
} from "@behindthemusictree/genre-tree-view";

import {
  CriteriaMinimum,
  CriteriaPlaylistSimple,
  type GenreUuid,
  type ArtistSearchResult,
  type RenderSongLink,
  type SongSearchResult,
} from "@behindthemusictree/app-kit/genre-tree";
import { CriteriaOverview } from "@behindthemusictree/app-kit/genre-tree";
import { Scope } from "@behindthemusictree/app-kit/transport";
import { useGenreTreeViewState, useArtist, useUpdateGenre, genreUpdateMutationKey } from "@behindthemusictree/app-kit/genre-tree";
import { usePopup } from "@behindthemusictree/app-kit/popup";
import type { GenreDetailSlots } from "./GenreDetailExtras";
import type { GenrePlaylistTracksSlots } from "./GenrePlaylistTracks";
import type { HostOverlayPanel } from "./overlayPanel";
import { toTreeNodes } from "./playlist-tree/toTreeNodes";
import type { RenderArtistLink } from "@behindthemusictree/app-kit/genre-tree";

import GenrePlaylistTreePerRoot from "./playlist-tree/TreePerRoot";
import GenrePlaylistTreeWheel from "./playlist-tree/TreeWheel";
import GenrePlaylistTreeWheelRadialPopCore, { type GenreFocusProps } from "./playlist-tree/TreeWheelRadialPopCore";
import { GenreTreeWheelHandoff } from "./GenreTreeWheelHandoff";
import { GenreTreeSearch, type GenreSearchGroupsProps } from "./GenreTreeSearch";
import { type SearchGroup } from "./search";
import { useGenreDetailContent } from "./GenreDetailPanel";
import ChangeParentPopup, { type ParentChange } from "./ChangeParentPopup";
import { useEntityPanel } from "./useEntityPanel";
import { SizeMetricToggle } from "./SizeMetricToggle";
import { hasViewsCount, type GenreTreeSizeMetric } from "./playlist-tree/size-metric";
import { useGenrePlaylistPlayback, type GenrePlaylistPlayback } from "./playlist-tree/useGenrePlaylistPlayback";
import type { GetGenreTreeShareUrl, GenreTreeShareTarget } from "./share";

export type {
  FocusChangeReason,
  GenreTreeViewMode,
} from "@behindthemusictree/genre-tree-view";
export type { GenreFocusProps } from "./playlist-tree/TreeWheelRadialPopCore";

/** Artists are searched by default; picking one opens its panel (see `artistUuid`). */
export type ArtistSearchProps =
  | { artistSearch: false; onArtistSelect?: never; artistSearchBaseUrl?: never }
  | {
      artistSearch?: true;
      /** Notified when a suggestion is picked, after the view opens its artist panel. */
      onArtistSelect?: (artist: ArtistSearchResult) => void;
      /** Backend that serves `artists/` (search and the artist panel). Defaults to `getBackendBaseUrl`. */
      artistSearchBaseUrl?: () => string;
    };

const NO_POP_ROOT_TITLE = "This genre tree has no 'Mainstream Pop' root yet";

export type GenreTreeViewProps<O extends CriteriaOverview = CriteriaOverview> = {
  scope: Scope;
  /** "regions" lays the info panel out in the brand's left/center/right columns (see brand `--layout-center-*`). */
  placement?: "default" | "regions";
  handleGenreCreationAction: (parent: CriteriaMinimum | null) => void;
  handleGenreRenameAction: (genre: CriteriaMinimum) => void;
  getBackendBaseUrl: () => string;
  /** Called after the Parent popup moved a genre; `from` and `to` are genre (criteria) uuids, `from` null for a root genre. */
  onParentChanged?: (change: ParentChange) => void;
  additionalActions?: (node: GenreTreeNode) => GenreTreeAction[];
  /** Controlled view mode. When provided, the internal Stacked/Wheel toggle is not rendered — the consumer owns that UI. */
  viewMode?: GenreTreeViewMode;
  /** Selected genre entity, including genres outside the rendered tree. */
  selectedGenreUuid?: GenreUuid | null;
  /** Called on every user-driven selection change (tree click, search pick, search clear). */
  onSelectedGenreUuidChange?: (genreUuid: GenreUuid | null) => void;
  /** Mount-only seed for the pan/zoom (wheel, pop-core and stacked views), replacing the initial fit. */
  defaultViewport?: GenreTreeViewport;
  /** Restore silently after layout; use a new revision for each navigation. Supply focus, selection,
   * and restoration together. User interaction supersedes a pending request. In stacked view,
   * the selected genre must resolve to a root; outline ignores restoration. */
  viewportRestore?: GenreTreeProps["viewportRestore"];
  /** Fires after a user-driven pan/zoom settles. In stacked view, only the tree holding the selection reports. */
  onViewportChange?: (viewport: GenreTreeViewport) => void;
  /** When true, hides the "Add root" button and suppresses per-node
   * create/rename affordances, for a read-only consumer. Defaults to false. */
  readOnly?: boolean;
  /** Further result groups (e.g. places) shown in the search box next to genres, artists and songs. */
  extraSearchGroups?: SearchGroup[];
  /** Host search hooks run inside this subtree, so typing does not rerender the tree page. */
  SearchGroups?: ComponentType<GenreSearchGroupsProps>;
  /** Fires with the typed search text (empty when cleared), so a host can drive its own `extraSearchGroups`. */
  onSearchQueryChange?: (text: string) => void;
  /** Fires when the search box gains focus, e.g. to load data for `extraSearchGroups` lazily. */
  onSearchFocus?: () => void;
  /** Root element classes; the component adds no outer margin. */
  className?: string;
  /** Shows the "Tree display options" group (e.g. Rotation). Defaults to true. */
  showDisplayOptions?: boolean;
  /** Shows the "Add root" button (still hidden when `readOnly`). Defaults to true; a host rendering its own passes false. */
  showAddRoot?: boolean;
  /** Controlled wheel rotation. When provided, the internal Rotation toggle is not rendered — the consumer owns that UI. */
  allowWheelRotation?: boolean;
  /** Parses the selected genre's overview; pass an extended schema to keep consumer-specific fields. */
  criteriaOverviewSchema?: z.ZodType<O, unknown>;
  /** Consumer-specific rows rendered in the info panel after Summary. */
  renderGenreDetailExtras?: (overview: O) => ReactNode;
  /** Host control displayed before the size metric in the floating controls. */
  floatingControlsLeading?: ReactNode;
  /** Controlled size metric of the wheel and pop-core nodes: song count or summed song views. Uncontrolled when omitted
   * (starts on songs). The toggle is hidden while an artist filters the tree, which only has song counts. */
  sizeMetric?: GenreTreeSizeMetric;
  onSizeMetricChange?: (metric: GenreTreeSizeMetric) => void;
  /** When set, artist names in the info panel's track list render through it (e.g. a router `Link`). In the artist
   * panel, names otherwise render as buttons that switch the panel to that artist. */
  renderArtistLink?: RenderArtistLink;
  /** Controlled artist panel (an artist uuid). It shares the info panel's slot: opening an artist clears the selected
   * genre; selecting a genre keeps the artist as a filter (the tree shows only genres the artist has songs in, and
   * the genre's songs and play button are limited to the artist) and shows the genre's panel instead. A host
   * `overlayPanel` takes precedence over the artist panel. */
  artistUuid?: string | null;
  /** Called when the user opens an artist (search pick, member link) or closes its panel. */
  onArtistUuidChange?: (uuid: string | null) => void;
  /** Controlled expanded state of the artist panel. Uncontrolled, it resets to compact on each artist. */
  artistExpanded?: boolean;
  onArtistExpandedChange?: (expanded: boolean) => void;
  /** Controlled song panel (a song uuid). Like the artist panel it shares the info panel's slot: opening a song clears
   * the selected genre and the artist; selecting a genre closes it. A host `overlayPanel` takes precedence. */
  songUuid?: string | null;
  /** Called when the user opens a song (search pick, title link) or closes its panel. */
  onSongUuidChange?: (uuid: string | null) => void;
  /** Controlled expanded state of the song panel. Uncontrolled, it resets to compact on each song. */
  songExpanded?: boolean;
  onSongExpandedChange?: (expanded: boolean) => void;
  /** Songs are searched by default; picking one opens its panel. */
  songSearch?: boolean;
  onSongSelect?: (song: SongSearchResult) => void;
  /** When set, song titles in the info panel's track list render through it (e.g. a router `Link` to the song).
   * By default they are buttons that open the song panel. */
  renderSongLink?: RenderSongLink;
  /** Resolves a selected genre, artist or song to a share URL using the host app's routes. */
  getShareUrl?: GetGenreTreeShareUrl;
} & ArtistSearchProps &
  GenreDetailSlots<O> &
  GenrePlaylistTracksSlots &
  GenreFocusProps & {
    /** Appended to a selected genre's panel, e.g. destructive actions. */
    renderDangerZone?: (node: GenreTreeNode) => ReactNode;
    /** Controlled expanded state of the genre panel. Uncontrolled when omitted. */
    expanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
    /** A host panel rendered in the detail panel's slot; it takes precedence over the genre, song and artist panels.
     * Like theirs, its title fills the search field, whose clear button closes it. */
    overlayPanel?: HostOverlayPanel;
    /** Hides the info panel behind its edge tab; uncontrolled when omitted. Only applies with `placement="regions"`. */
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
  };

const REGIONS_CLASS =
  "[--gtv-center-left:var(--layout-center-left)] [--gtv-center-right:var(--layout-center-right)] [--gtv-center-top:var(--layout-band-top)]";

const noop = () => {};

export function GenreTreeView<O extends CriteriaOverview = CriteriaOverview>({
  scope,
  handleGenreCreationAction,
  handleGenreRenameAction,
  onParentChanged,
  getBackendBaseUrl,
  additionalActions,
  viewMode: controlledViewMode,
  selectedGenreUuid: controlledSelectedGenreUuid,
  onSelectedGenreUuidChange,
  defaultViewport,
  viewportRestore,
  onViewportChange,
  readOnly = false,
  className,
  showDisplayOptions = true,
  showAddRoot = true,
  allowWheelRotation: controlledAllowWheelRotation,
  criteriaOverviewSchema,
  renderGenreDetailExtras,
  floatingControlsLeading,
  sizeMetric: controlledSizeMetric,
  onSizeMetricChange,
  renderArtistLink,
  artistUuid: controlledArtistUuid,
  onArtistUuidChange,
  artistExpanded: controlledArtistExpanded,
  onArtistExpandedChange,
  getShareUrl,
  extraSearchGroups = [],
  SearchGroups,
  onSearchQueryChange,
  onSearchFocus,
  artistSearch = true,
  onArtistSelect,
  artistSearchBaseUrl,
  songUuid: controlledSongUuid,
  onSongUuidChange,
  songExpanded: controlledSongExpanded,
  onSongExpandedChange,
  songSearch = true,
  onSongSelect,
  renderSongLink,
  renderSummary,
  renderEssentialTracks,
  renderSongLeading,
  renderSongActions,
  renderTracksToolbar,
  renderDangerZone,
  expanded,
  onExpandedChange,
  collapsed,
  onCollapsedChange,
  overlayPanel,
  placement = "default",
  ...focus
}: GenreTreeViewProps<O>) {
  const getShareUrlRef = useRef(getShareUrl);
  getShareUrlRef.current = getShareUrl;
  const [internalArtistUuid, setInternalArtistUuid] = useState<string | null>(null);
  const isArtistControlled = controlledArtistUuid !== undefined;
  const artistUuid = isArtistControlled ? controlledArtistUuid : internalArtistUuid;
  const [internalSongUuid, setInternalSongUuid] = useState<string | null>(null);
  const isSongControlled = controlledSongUuid !== undefined;
  const songUuid = isSongControlled ? controlledSongUuid : internalSongUuid;
  const changeSong = (uuid: string | null) => {
    if (!isSongControlled) setInternalSongUuid(uuid);
    onSongUuidChange?.(uuid);
  };
  const [internalSizeMetric, setInternalSizeMetric] = useState<GenreTreeSizeMetric>("songs");
  const sizeMetric = controlledSizeMetric ?? internalSizeMetric;
  const deferredSizeMetric = useDeferredValue(sizeMetric);
  const changeSizeMetric = (metric: GenreTreeSizeMetric) => {
    if (controlledSizeMetric === undefined) setInternalSizeMetric(metric);
    onSizeMetricChange?.(metric);
  };
  const changeArtist = (uuid: string | null) => {
    if (!isArtistControlled) setInternalArtistUuid(uuid);
    onArtistUuidChange?.(uuid);
  };
  const {
    isLoading,
    isError,
    refetch,
    isFetching: isTreeFetching,
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
    isViewModeControlled: isControlled,
    setViewMode,
    canShowPopCore,
    allowWheelRotation: internalAllowWheelRotation,
    toggleWheelRotation,
    onNodeHover: handleNodeHover,
  } = useGenreTreeViewState<O>({
    scope,
    getBackendBaseUrl,
    viewMode: controlledViewMode,
    selectedGenreUuid: controlledSelectedGenreUuid,
    onSelectedGenreUuidChange,
    criteriaOverviewSchema,
    artistUuid,
  });

  // Renderer revision tracking is per instance: bind a navigation to one stacked root so a
  // later user selection cannot replay the same request in another renderer.
  const restoreRevision = viewportRestore?.revision;
  const [stackedRestoreOwner, setStackedRestoreOwner] = useState<{
    revision: string | number | undefined;
    rootUuid: string | undefined;
  }>({ revision: restoreRevision, rootUuid: selectedGenrePlaylist?.root.uuid });
  let restoreRootUuid = stackedRestoreOwner.rootUuid;
  if (stackedRestoreOwner.revision !== restoreRevision) {
    restoreRootUuid = selectedGenrePlaylist?.root.uuid;
    setStackedRestoreOwner({ revision: restoreRevision, rootUuid: restoreRootUuid });
  } else if (restoreRootUuid === undefined && selectedGenrePlaylist) {
    restoreRootUuid = selectedGenrePlaylist.root.uuid;
    setStackedRestoreOwner({ revision: restoreRevision, rootUuid: restoreRootUuid });
  }

  const isGenreUpdating = useIsMutating({ mutationKey: genreUpdateMutationKey }) > 0;
  const { mutate: updateGenre } = useUpdateGenre(scope, getBackendBaseUrl);
  const busy = deferredSizeMetric !== sizeMetric || isTreeFetching || isGenreUpdating;
  // The artist detail can load after the filtered counts, so use the UUID as the filter state.
  const isArtistFiltered = artistUuid !== null;
  const canSizeByViews = !isArtistFiltered && hasViewsCount(visibleGenrePlaylists);

  const artistResult = useArtist(artistUuid, artistSearchBaseUrl ?? getBackendBaseUrl);
  const filterArtistName = artistResult.status === "success" ? artistResult.artist.name : null;
  const filterArtist = useMemo(
    () => (artistUuid !== null && filterArtistName !== null ? { uuid: artistUuid, name: filterArtistName } : null),
    [artistUuid, filterArtistName],
  );
  const hasSelectedGenreNode =
    selectedGenrePlaylist !== undefined && visibleGenrePlaylists.some(({ uuid }) => uuid === selectedGenrePlaylist.uuid);
  const playback = useGenrePlaylistPlayback({ scope, genrePlaylists: visibleGenrePlaylists, artist: filterArtist });
  const openArtist = (uuid: string) => {
    if (selectedGenreUuid !== null) clearSelection();
    if (songUuid !== null) changeSong(null);
    changeArtist(uuid);
  };
  const openSong = (uuid: string) => {
    if (selectedGenreUuid !== null) clearSelection();
    changeSong(uuid);
  };
  // Kept stable: it feeds the memoized info panel body, which must not rebuild on every render.
  const openSongRef = useRef(openSong);
  openSongRef.current = openSong;
  const resolvedRenderSongLink = useCallback<RenderSongLink>(
    (song) =>
      renderSongLink ? (
        renderSongLink(song)
      ) : (
        <button type="button" onClick={() => openSongRef.current(song.uuid)} className="hover:underline">
          {song.title}
        </button>
      ),
    [renderSongLink],
  );
  const [expandedSongUuid, setExpandedSongUuid] = useState<string | null>(null);
  // Keyed by artist, so switching artists (including a host's back/forward) starts compact.
  const [expandedArtistUuid, setExpandedArtistUuid] = useState<string | null>(null);
  const artistBaseUrl = artistSearchBaseUrl ?? getBackendBaseUrl;
  const songBaseUrl = getBackendBaseUrl;
  const resolvedRenderArtistLink: RenderArtistLink =
    renderArtistLink ??
    ((artist) =>
      artist.isSpecialPurpose ? (
        artist.name
      ) : (
        <button type="button" onClick={() => openArtist(artist.uuid)} className="hover:underline">
          {artist.name}
        </button>
      ));
  const getGenrePath = (genre: CriteriaMinimum): CriteriaPlaylistSimple[] => {
    const path: CriteriaPlaylistSimple[] = [];
    let current = visibleGenrePlaylists.find((playlist) => playlist.criteria?.uuid === genre.uuid);
    while (current) {
      path.unshift(current);
      const parentUuid: string | undefined = current.parent?.uuid;
      current = parentUuid ? visibleGenrePlaylists.find((playlist) => playlist.uuid === parentUuid) : undefined;
    }
    return path;
  };
  const entityPanel = useEntityPanel({
    scope,
    getBackendBaseUrl: songBaseUrl,
    getArtistBackendBaseUrl: artistBaseUrl,
    getShareUrl: getShareUrlRef.current,
    renderArtistLink: resolvedRenderArtistLink,
    renderSongLink: resolvedRenderSongLink,
    song: {
      uuid: songUuid,
      expanded: controlledSongExpanded ?? (songUuid !== null && expandedSongUuid === songUuid),
      onExpandedChange: (on) => {
        if (controlledSongExpanded === undefined) setExpandedSongUuid(on ? songUuid : null);
        onSongExpandedChange?.(on);
      },
      onClose: () => changeSong(null),
    },
    artist: {
      uuid: artistUuid,
      expanded: controlledArtistExpanded ?? (artistUuid !== null && expandedArtistUuid === artistUuid),
      onExpandedChange: (on) => {
        if (controlledArtistExpanded === undefined) setExpandedArtistUuid(on ? artistUuid : null);
        onArtistExpandedChange?.(on);
      },
      onClose: () => changeArtist(null),
    },
    getGenrePath,
    onSelectGenrePlaylist: (genrePlaylist) => {
      changeSong(null);
      selectGenrePlaylist(genrePlaylist);
    },
  });
  // A host panel takes precedence over the genre's; a selected genre's panel replaces the artist's or song's, and the
  // artist stays active as a filter.
  const otherPanel = overlayPanel ?? (selectedGenreUuid !== null ? undefined : entityPanel);

  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(false);
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(false);
  const isCollapsed = collapsed ?? uncontrolledCollapsed;
  const isExpanded = expanded ?? uncontrolledExpanded;
  const changeCollapsed = (next: boolean) => {
    setUncontrolledCollapsed(next);
    onCollapsedChange?.(next);
  };
  const changeExpanded = (next: boolean) => {
    setUncontrolledExpanded(next);
    onExpandedChange?.(next);
  };
  useEffect(() => {
    setUncontrolledCollapsed(false);
  }, [selectedGenreUuid, artistUuid, songUuid]);

  const [isWheelRevealed, setIsWheelRevealed] = useState(false);
  const usesHandoff = viewMode === "wheel" || viewMode === "pop-core";
  // The panel stands beside a tree that fades in, so it waits for the tree.
  const isTreeReady = !isLoading && !isError && (!usesHandoff || isWheelRevealed);

  // The tree publishes how it draws each node; the panel header and family chips reuse it.
  const [resolveStyle, setResolveStyle] = useState<GenreNodeStyleResolver | null>(null);
  const handleNodeStyleResolverChange = useCallback(
    (resolver: GenreNodeStyleResolver) => setResolveStyle(() => resolver),
    [],
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const obscuredInset = useObscuredInset(panelRef);
  const hostPanel = { obscuredInset, onNodeStyleResolverChange: handleNodeStyleResolverChange };

  const nodeMetric: GenreTreeSizeMetric = isArtistFiltered || !canSizeByViews ? "songs" : deferredSizeMetric;
  const treeNodes = useMemo(() => toTreeNodes(visibleGenrePlaylists, nodeMetric), [visibleGenrePlaylists, nodeMetric]);
  const relations = useGenreNodeRelations(
    treeNodes,
    !overlayPanel && hasSelectedGenreNode ? selectedNodeId : null,
    resolveStyle,
  );

  const [selectionHistory, setSelectionHistory] = useState<{ current: GenreUuid | null; previous: GenreUuid | null }>({ current: selectedGenreUuid, previous: null });
  if (selectionHistory.current !== selectedGenreUuid) {
    setSelectionHistory({ current: selectedGenreUuid, previous: selectionHistory.current ?? selectionHistory.previous });
  }
  const handlePrevious = selectionHistory.previous ? () => selectGenre(selectionHistory.previous) : undefined;

  const { showPopup, hidePopup } = usePopup();
  const reopenPanel = () => { setUncontrolledCollapsed(false); onCollapsedChange?.(false); };
  const handleSelectedNodeChange = (node: { id: string } | null) => {
    reopenPanel();
    if (node !== null && songUuid !== null) changeSong(null);
    selectNode(node);
  };
  const handleGenreSearchSelect = (genrePlaylist: CriteriaPlaylistSimple) => {
    reopenPanel();
    if (songUuid !== null) changeSong(null);
    selectGenrePlaylist(genrePlaylist);
  };

  // Mirrors genre-tree-view's isZoomableNode: a node zooms when it has children and at most one pop-side child.
  const selectedUuid = selectedGenrePlaylist?.uuid;
  const selectedChildren = selectedUuid
    ? visibleGenrePlaylists.filter((genrePlaylist) => genrePlaylist.parent?.uuid === selectedUuid)
    : [];
  const canZoomIn =
    viewMode === "pop-core" &&
    focus.onFocusGenreChange !== undefined &&
    selectedUuid !== undefined &&
    focus.focusGenreUuid !== selectedUuid &&
    selectedChildren.length > 0 &&
    selectedChildren.filter((child) => child.criteria?.side === "pop").length <= 1;
  const handleGenreSearchZoomIn = () => {
    if (selectedUuid) focus.onFocusGenreChange?.(selectedUuid, "zoom-in");
  };
  const zoomInRef = useRef<(() => void) | undefined>(undefined);
  zoomInRef.current = canZoomIn ? handleGenreSearchZoomIn : undefined;

  const genrePlaylist = selectedGenrePlaylist;
  const criteria = genrePlaylist?.criteria;
  const parentPlaylist = visibleGenrePlaylists.find(({ uuid }) => uuid === genrePlaylist?.parent?.uuid);
  const canToggleSide = !readOnly && criteria !== undefined && criteria !== null && parentPlaylist !== undefined && parentPlaylist.parent === null;
  const side = criteria?.side ?? "core";
  const popSibling = canToggleSide && side === "core" ? visibleGenrePlaylists.find((sibling) => sibling.parent?.uuid === parentPlaylist.uuid && sibling.uuid !== genrePlaylist?.uuid && sibling.criteria?.side === "pop") : undefined;
  const shareTarget: GenreTreeShareTarget | undefined = selectedGenreUuid ? { kind: "genre", genreUuid: selectedGenreUuid, name: criteria?.name ?? "Genre", scope, artistUuid } : undefined;
  const shareUrl = shareTarget ? getShareUrlRef.current?.(shareTarget) ?? undefined : undefined;
  const genreContent = useGenreDetailContent<O>({
    genreUuid: selectedGenreUuid,
    scope, getBackendBaseUrl,
    onSelectGenre: (uuid) => { reopenPanel(); selectGenre(uuid); },
    expanded: isExpanded,
    treeRelations: relations,
    playback,
    genrePlaylist: selectedGenrePlaylist,
    band: {
      ...(relations ? { node: relations.node } : {}),
      shareTarget: shareUrl ? shareTarget : undefined, shareUrl,
      onZoomIn: zoomInRef.current,
      onAddChild: readOnly || !criteria ? undefined : () => handleGenreCreationAction(criteria),
      onRename: readOnly || !criteria ? undefined : () => handleGenreRenameAction(criteria),
      onChangeParent: readOnly || !genrePlaylist || !criteria
        ? undefined
        : () =>
            showPopup(
              <ChangeParentPopup
                genrePlaylist={{ ...genrePlaylist, criteria }}
                genrePlaylists={visibleGenrePlaylists}
                scope={scope}
                getBackendBaseUrl={getBackendBaseUrl}
                onClose={hidePopup}
                onParentChanged={onParentChanged}
              />,
            ),
      side,
      onToggleSide: canToggleSide && criteria
        ? () => updateGenre({ uuid: criteria.uuid, data: { side: side === "pop" ? "core" : "pop" } })
        : undefined,
      toggleSideDisabledReason: popSibling
        ? `${popSibling.name} is already the pop side of ${parentPlaylist?.name}`
        : undefined,
      additionalActions,
    },
    extras: { criteriaOverviewSchema, renderGenreDetailExtras, renderArtistLink,
      renderSongLink: resolvedRenderSongLink, artist: filterArtist, renderSummary,
      renderEssentialTracks, renderSongLeading, renderSongActions, renderTracksToolbar },
    trailing: relations ? renderDangerZone?.(relations.node) : undefined,
  });

  const isRotationControlled = controlledAllowWheelRotation !== undefined;
  const allowWheelRotation = controlledAllowWheelRotation ?? internalAllowWheelRotation;

  type ActivePanel = {
    title: ReactNode;
    content: ReactNode;
    aside?: ReactNode;
    expanded: boolean;
    onExpandedChange?: (expanded: boolean) => void;
    onClose: () => void;
    // Every panel's name lives in the search field, and the search field closes it; null leaves the field empty.
    searchName: string | null;
    headerAccent?: { background: string; color: string };
  };
  let activePanel: ActivePanel | null = null;
  if (otherPanel) {
    activePanel = {
      title: otherPanel.title,
      content: otherPanel.content,
      aside: otherPanel.extraContent,
      expanded: otherPanel.expanded ?? false,
      onExpandedChange: otherPanel.onExpandedChange,
      onClose: otherPanel.onClose,
      searchName: otherPanel.title,
    };
  } else if (selectedGenreUuid) {
    activePanel = {
      title: genreContent.title,
      content: genreContent.content,
      aside: genreContent.aside,
      expanded: isExpanded,
      onExpandedChange: changeExpanded,
      onClose: clearSelection,
      searchName: genreContent.name,
      headerAccent: genreContent.headerAccent,
    };
  }
  const isPanelShown = activePanel !== null && (selectedGenreUuid !== null || isTreeReady);

  const detailTab =
    placement === "regions" && activePanel?.onExpandedChange
      ? {
          edge: activePanel.expanded
            ? { label: "Shrink panel", onClick: () => activePanel.onExpandedChange?.(false) }
            : isCollapsed
              ? null
              : { label: "Hide panel", onClick: () => changeCollapsed(true) },
          center: activePanel.expanded
            ? null
            : isCollapsed
              ? { label: "Show panel", onClick: () => changeCollapsed(false) }
              : activePanel.onExpandedChange
                ? { label: "Extend panel", onClick: () => activePanel.onExpandedChange?.(true) }
                : null,
        }
      : undefined;

  const expandButton =
    placement === "default" && activePanel?.onExpandedChange ? (
      <IconButton
        aria-label={activePanel.expanded ? "Shrink panel" : "Extend panel"}
        style={activePanel.headerAccent && { color: "inherit" }}
        onClick={() => activePanel.onExpandedChange?.(!activePanel.expanded)}
      >
        {activePanel.expanded ? (
          <Minimize2 aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Maximize2 aria-hidden="true" className="h-4 w-4" />
        )}
      </IconButton>
    ) : null;

  const renderArtistFilter = () => {
    if (isLoading || !filterArtist) return null;
    return (
      <span className="inline-flex items-center overflow-hidden rounded-full bg-[var(--color-neutral-100)] text-body">
        <button
          type="button"
          className="py-1 pl-3 pr-2 [@media(pointer:coarse)]:min-h-[var(--layout-touch-target)] hover:underline"
          aria-label={`Show artist ${filterArtist.name}`}
          onClick={() => {
            if (selectedGenreUuid !== null) clearSelection();
          }}
        >
          {filterArtist.name}
        </button>
        <button
          type="button"
          className="py-1 pl-1 pr-3 [@media(pointer:coarse)]:min-h-[var(--layout-touch-target)] hover:text-[var(--color-text)]"
          aria-label={`Clear artist filter ${filterArtist.name}`}
          onClick={() => changeArtist(null)}
        >
          ×
        </button>
      </span>
    );
  };

  const actions = (
    <>
      {!isLoading && !isError && (
        <GenreTreeSearch
          artistBaseUrl={artistBaseUrl}
          songBaseUrl={songBaseUrl}
          artistSearch={Boolean(artistSearch)}
          songSearch={Boolean(songSearch)}
          onArtistSelect={(artist) => { openArtist(artist.uuid); onArtistSelect?.(artist); }}
          onSongSelect={(song) => { openSong(song.uuid); onSongSelect?.(song); }}
          SearchGroups={SearchGroups}
          genrePlaylists={visibleGenrePlaylists}
          onSelect={handleGenreSearchSelect}
          onSelectGenre={(uuid) => { reopenPanel(); if (songUuid) changeSong(null); selectGenre(uuid); }}
          selectedName={activePanel?.searchName ?? null}
          onClear={activePanel?.onClose}
          showClear={activePanel !== null}
          clearLabel="Close panel"
          onPrevious={handlePrevious}
          onQueryChange={onSearchQueryChange}
          onFocus={onSearchFocus}
          extraGroups={extraSearchGroups}
        />
      )}
      {!isLoading && !isError && filterArtist && (
        <div className="hidden w-full justify-center max-md:flex">{renderArtistFilter()}</div>
      )}
      <div className="contents max-md:flex max-md:w-full max-md:items-center max-md:gap-2 max-md:overflow-x-auto max-md:[scrollbar-width:none] max-md:[&>*]:shrink-0">
        {!isLoading && !isError && !isControlled && (
          <SegmentedControl
            aria-label="Tree view mode"
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: "pop-core", label: "Pop/Core", disabled: !canShowPopCore, title: canShowPopCore ? undefined : NO_POP_ROOT_TITLE },
              { value: "wheel", label: "Wheel" },
              { value: "stacked", label: "Stacked" },
              { value: "outline", label: "Outline", disabled: !canShowPopCore, title: canShowPopCore ? undefined : NO_POP_ROOT_TITLE },
            ]}
          />
        )}
        {!isLoading && !isError && showDisplayOptions && (
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label="Tree display options"
          >
            {!isRotationControlled && viewMode !== "stacked" && viewMode !== "outline" && (
              <Button
                variant={allowWheelRotation ? "default" : "outline"}
                size="sm"
                onClick={toggleWheelRotation}
              >
                Rotation
              </Button>
            )}
          </div>
        )}
        {!isLoading && !isError && !readOnly && showAddRoot && (
          <IconTextButton
            icon={Plus}
            text="Add root"
            onClick={() => handleGenreCreationAction(null)}
          />
        )}
      </div>
    </>
  );

  return (
    <div
      data-left-panel={isPanelShown && !isCollapsed ? undefined : "hidden"}
      className={["genre-tree-view relative flex flex-col h-full", placement === "regions" && REGIONS_CLASS, className]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={`actions-container absolute z-30 flex items-center gap-2 ${
          placement === "regions"
            ? "left-[calc(var(--layout-gutter)+var(--layout-panel-inset))] top-[calc(var(--layout-gutter)+var(--layout-panel-inset))] md:left-[var(--layout-panel-inset)] md:top-[var(--layout-panel-inset)] max-md:right-[calc(var(--layout-gutter)+var(--layout-panel-inset))] max-md:top-[var(--layout-band-top)] max-md:flex-col max-md:items-stretch"
            : "left-5 top-5"
        }`}
      >
        {actions}
      </div>
      {!isLoading && !isError && filterArtist && (
        <div
          className={`absolute left-1/2 z-30 hidden -translate-x-1/2 md:block ${
            placement === "regions" ? "top-[calc(var(--layout-gutter)+var(--layout-panel-inset))] md:top-[var(--layout-panel-inset)]" : "top-5"
          }`}
        >
          {renderArtistFilter()}
        </div>
      )}
      <div className="content-container flex-1 min-h-0 flex flex-row gap-4">
        <div className="tree-view-container relative flex-1 min-w-0 flex flex-col h-full">
          {!isLoading && !isError && viewMode === "outline" && floatingControlsLeading && (
            <div className="absolute bottom-3 right-3 z-10">{floatingControlsLeading}</div>
          )}
          {isLoading ? (
            <GenreTreeViewSkeleton viewMode={viewMode} />
          ) : isError ? (
            <p role="alert" className="m-auto text-center">
              Couldn&apos;t load the genre tree.{" "}
              <button type="button" className="underline" onClick={refetch}>
                Retry
              </button>
            </p>
          ) : viewMode === "wheel" ? (
            // The info panel's top edge aligns with the tree's; the search bar floats `--layout-panel-inset` below it,
            // and the header inset (the bar's height plus that inset) extends the header's fill behind the bar,
            // Google Maps style; the 8px bottom padding mirrors the inset above the bar, and the hidden title's height is zeroed.
            // The panel's own Zoom in button is hidden: the search bar carries it.
            <div className="tree-container search-overlay relative flex-1 w-full min-h-0 ">
              <GenreTreeWheelHandoff skeleton={<GenreTreeWheelSkeleton />} onRevealedChange={setIsWheelRevealed}>
                <GenrePlaylistTreeWheel
                  scope={scope}
                  genrePlaylists={visibleGenrePlaylists}
                  handleGenreCreationAction={handleGenreCreationAction}
                  handleGenreRenameAction={handleGenreRenameAction}
                  additionalActions={additionalActions}
                  onSelectedNodeChange={handleSelectedNodeChange}
                                                      onNodeHover={handleNodeHover}
                  {...hostPanel}
                  playback={playback}
                  selectedNodeId={selectedNodeId}
                  readOnly={readOnly}
                  allowWheelRotation={allowWheelRotation}
                  sizeMetric={isArtistFiltered || !canSizeByViews ? "songs" : deferredSizeMetric}
                  busy={busy}
                  floatingControlsLeading={
                    floatingControlsLeading || canSizeByViews ? (
                      <div className="flex items-center gap-2">
                        {floatingControlsLeading}
                        {canSizeByViews && <SizeMetricToggle value={sizeMetric} onChange={changeSizeMetric} />}
                      </div>
                    ) : undefined
                  }
                  defaultViewport={defaultViewport}
                  viewportRestore={viewportRestore}
                  onViewportChange={onViewportChange}
                />
              </GenreTreeWheelHandoff>
            </div>
          ) : viewMode === "pop-core" ? (
            // Same as the wheel: the header inset extends its fill behind the floating search bar, Google Maps style.
            <div className="tree-container search-overlay relative flex-1 w-full min-h-0 ">
              <GenreTreeWheelHandoff skeleton={<GenreTreeWheelSkeleton />} onRevealedChange={setIsWheelRevealed}>
                <GenrePlaylistTreeWheelRadialPopCore
                  scope={scope}
                  genrePlaylists={visibleGenrePlaylists}
                  handleGenreCreationAction={handleGenreCreationAction}
                  handleGenreRenameAction={handleGenreRenameAction}
                  additionalActions={additionalActions}
                  onSelectedNodeChange={handleSelectedNodeChange}
                                                      onNodeHover={handleNodeHover}
                  {...hostPanel}
                  playback={playback}
                  selectedNodeId={selectedNodeId}
                  readOnly={readOnly}
                  allowWheelRotation={allowWheelRotation}
                  sizeMetric={isArtistFiltered || !canSizeByViews ? "songs" : deferredSizeMetric}
                  busy={busy}
                  floatingControlsLeading={
                    floatingControlsLeading || canSizeByViews ? (
                      <div className="flex items-center gap-2">
                        {floatingControlsLeading}
                        {canSizeByViews && <SizeMetricToggle value={sizeMetric} onChange={changeSizeMetric} />}
                      </div>
                    ) : undefined
                  }
                  defaultViewport={defaultViewport}
                  viewportRestore={viewportRestore}
                  onViewportChange={onViewportChange}
                  {...focus}
                />
              </GenreTreeWheelHandoff>
            </div>
          ) : viewMode === "outline" ? (
            <div className="tree-container flex-1 min-h-0 w-full overflow-y-auto relative">
              <GenrePlaylistTreeWheelRadialPopCore
                outline
                scope={scope}
                genrePlaylists={visibleGenrePlaylists}
                handleGenreCreationAction={handleGenreCreationAction}
                handleGenreRenameAction={handleGenreRenameAction}
                additionalActions={additionalActions}
                onSelectedNodeChange={handleSelectedNodeChange}
                                                onNodeHover={handleNodeHover}
                {...hostPanel}
                playback={playback}
                selectedNodeId={selectedNodeId}
                readOnly={readOnly}
              />
            </div>
          ) : (
            <div className="tree-container relative flex flex-col gap-4 w-full pt-14 overflow-x-auto overflow-y-auto text-[var(--color-text)]">
              {Object.entries(groupedGenrePlaylistsByRoot).map(
                ([uuid, genrePlaylistTreePerRoot]) => {
                  return (
                    <div
                      key={uuid}
                      className="tree-per-root-container relative shrink-0 h-[28rem] mt-2 mr-16 p-2 bg-[var(--color-neutral-100)] rounded-lg"
                    >
                      <div className="graph-container relative z-10 h-full">
                        <GenrePlaylistTreePerRoot
                          scope={scope}
                          rootUuid={uuid}
                          genrePlaylistTreePerRoot={genrePlaylistTreePerRoot}
                          handleGenreCreationAction={handleGenreCreationAction}
                          handleGenreRenameAction={handleGenreRenameAction}
                          additionalActions={additionalActions}
                          onSelectedNodeChange={handleSelectedNodeChange}
                                                                              onNodeHover={handleNodeHover}
                          {...hostPanel}
                          playback={playback}
                          // Each root has its own panel; null closes the one not holding the selection.
                          selectedNodeId={
                            uuid === selectedGenrePlaylist?.root.uuid ? selectedNodeId : null
                          }
                          readOnly={readOnly}
                          wheelZoom="modifier"
                          defaultViewport={
                            uuid === selectedGenrePlaylist?.root.uuid ? defaultViewport : undefined
                          }
                          viewportRestore={
                            uuid === selectedGenrePlaylist?.root.uuid && uuid === restoreRootUuid ? viewportRestore : undefined
                          }
                          onViewportChange={
                            uuid === selectedGenrePlaylist?.root.uuid ? onViewportChange : undefined
                          }
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
          {/* Always mounted: useObscuredInset observes the node once, so it must exist when the host mounts. */}
          <DetailPanel
            ref={panelRef}
            side="left"
            title={activePanel?.title ?? ""}
            titleInSearch={!isLoading && !isError}
            headerAccent={activePanel?.headerAccent}
            headerActions={expandButton}
            onClose={activePanel?.onClose ?? noop}
            collapsed={isCollapsed || !isPanelShown}
            expanded={activePanel?.expanded}
            onExpandedChange={activePanel?.onExpandedChange}
            aside={activePanel?.aside}
            edgeTab={detailTab}
          >
            {activePanel?.aside && !activePanel.expanded ? (
              <>
                {activePanel.content}
                {activePanel.aside}
              </>
            ) : (
              activePanel?.content
            )}
          </DetailPanel>
        </div>
      </div>
    </div>
  );
}
