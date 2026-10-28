"use client";

import { useCallback, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { z } from "zod";
import { Plus } from "lucide-react";
import { IconTextButton, Button, SegmentedControl } from "@behindthemusictree/ui";

import {
  GenreTreeWheelSkeleton,
  GenreTreeViewSkeleton,
} from "@behindthemusictree/genre-tree-view";
import type {
  ControlsOrientation,
  GenreTreeAction,
  GenreTreeNode,
  GenreTreeViewMode,
  GenreTreeViewport,
} from "@behindthemusictree/genre-tree-view";

import {
  CriteriaMinimum,
  CriteriaPlaylistSimple,
  useArtistSearch,
  type ArtistSearchResult,
} from "@behindthemusictree/app-kit/genre-tree";
import { CriteriaOverview } from "@behindthemusictree/app-kit/genre-tree";
import { Scope } from "@behindthemusictree/app-kit/transport";
import { useGenreTreeViewState, useTrackList, TrackListOriginType } from "@behindthemusictree/app-kit/genre-tree";
import { usePlayer } from "@behindthemusictree/app-kit/player";
import { usePopup } from "@behindthemusictree/app-kit/popup";
import { GenreDetailExtras, type GenreDetailSlots } from "./GenreDetailExtras";
import type { GenrePlaylistTracksSlots } from "./GenrePlaylistTracks";
import type { InfoPanelCurationProps } from "./playlist-tree/infoPanelCurationProps";
import type { RenderArtistLink } from "@behindthemusictree/app-kit/genre-tree";

import GenrePlaylistTreePerRoot from "./playlist-tree/TreePerRoot";
import GenrePlaylistTreeWheel from "./playlist-tree/TreeWheel";
import GenrePlaylistTreeWheelRadialPopCore, { type GenreFocusProps } from "./playlist-tree/TreeWheelRadialPopCore";
import { GenreTreeWheelHandoff } from "./GenreTreeWheelHandoff";
import GenreSearch, { type GenreSearchProps } from "./GenreSearch";
import GenreActionBand from "./GenreActionBand";
import PanelEdgeTab from "./PanelEdgeTab";
import ChangeParentPopup from "./ChangeParentPopup";
import { useArtistPanel } from "./artist/useArtistPanel";

// genre-tree-view's "previous" button (back to the last selected genre) renders inside the info panel, which sits
// under the floating search bar. It is hidden and its click is proxied by the search field's own button, which
// appears (fading in, sliding from the left) whenever the original exists; the field makes room for it.
const PREVIOUS_BUTTON_CSS = `
.genre-tree-view .gtv-info-panel-body { display: flex; flex-direction: column; }
.genre-tree-view .gtv-info-panel-extra { order: -1; }
.genre-tree-view .search-overlay .gtv-info-panel-previous { display: none; }
.genre-tree-view:has(.search-overlay .gtv-info-panel-previous) .genre-search input { padding-left: 2.75rem; }
.genre-tree-view:has(.search-overlay .gtv-info-panel-previous) .genre-search-previous { display: flex; }
@keyframes genre-tree-view-previous-in { from { opacity: 0; transform: translate(-0.5rem, -50%); } to { opacity: 1; transform: translate(0, -50%); } }
@media (prefers-reduced-motion: no-preference) {
  .genre-search-previous { animation: genre-tree-view-previous-in 200ms ease-out; }
}
`;

type GenreNodeActionBandProps = Omit<ComponentProps<typeof GenreActionBand>, "onPlayPause" | "isPlaying"> & {
  genrePlaylist: CriteriaPlaylistSimple;
  scope: Scope;
};

function GenreNodeActionBand({ genrePlaylist, scope, ...bandProps }: GenreNodeActionBandProps) {
  const { isPlaying, setIsPlaying } = usePlayer();
  const { trackList, playNewTrackListFromGenrePlaylist } = useTrackList();
  const isCurrentTrackList =
    trackList?.origin.type === TrackListOriginType.GENRE_PLAYLIST && trackList.origin.uuid === genrePlaylist.uuid;
  const handlePlayPause = () => {
    if (isCurrentTrackList) {
      setIsPlaying(!isPlaying);
      return;
    }
    playNewTrackListFromGenrePlaylist(genrePlaylist, scope).catch((error) => {
      console.error("Failed to load genre playlist tracks:", error);
    });
  };
  return (
    <GenreActionBand
      {...bandProps}
      onPlayPause={genrePlaylist.tracksCount > 0 ? handlePlayPause : undefined}
      isPlaying={isCurrentTrackList && isPlaying}
    />
  );
}

export type {
  ControlsOrientation,
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
  additionalActions?: (node: GenreTreeNode) => GenreTreeAction[];
  /** Controlled view mode. When provided, the internal Stacked/Wheel toggle is not rendered — the consumer owns that UI. */
  viewMode?: GenreTreeViewMode;
  /** Controlled selection (a genre playlist uuid, i.e. the tree node id). When provided, the
   * consumer owns it — e.g. to move the selection after deleting the selected genre. */
  selectedNodeId?: string | null;
  /** Called on every user-driven selection change (tree click, search pick, search clear). */
  onSelectedNodeIdChange?: (nodeId: string | null) => void;
  /** Mount-only seed for the pan/zoom (wheel, pop-core and stacked views), replacing the initial fit. */
  defaultViewport?: GenreTreeViewport;
  /** Fires after a user-driven pan/zoom settles. In stacked view, only the tree holding the selection reports. */
  onViewportChange?: (viewport: GenreTreeViewport) => void;
  /** When true, hides the "Add root" button and suppresses per-node
   * create/rename affordances, for a read-only consumer. Defaults to false. */
  readOnly?: boolean;
  /** Root element classes; the component adds no outer margin. */
  className?: string;
  /** Shows the "Tree display options" group (e.g. Rotation). Defaults to true. */
  showDisplayOptions?: boolean;
  /** Shows the "Add root" button (still hidden when `readOnly`). Defaults to true; a host rendering its own passes false. */
  showAddRoot?: boolean;
  /** Controlled wheel rotation. When provided, the internal Rotation toggle is not rendered — the consumer owns that UI. */
  allowWheelRotation?: boolean;
  /** Parses the selected genre's overview; pass an extended schema to keep consumer-specific fields. */
  criteriaOverviewSchema?: z.ZodType<O, z.ZodTypeDef, unknown>;
  /** Consumer-specific rows rendered in the info panel after Summary. */
  renderGenreDetailExtras?: (overview: O) => ReactNode;
  /** Layout of the wheel/tree floating zoom/pop/fit controls. Defaults to "horizontal". */
  controlsOrientation?: ControlsOrientation;
  /** When set, artist names in the info panel's track list render through it (e.g. a router `Link`). In the artist
   * panel, names otherwise render as buttons that switch the panel to that artist. */
  renderArtistLink?: RenderArtistLink;
  /** Controlled artist panel (an artist uuid). It shares the info panel's slot: opening an artist clears the selected
   * genre, and selecting a genre clears the artist. A host `overlayPanel` takes precedence over it. */
  artistUuid?: string | null;
  /** Called when the user opens an artist (search pick, member link) or closes its panel. */
  onArtistUuidChange?: (uuid: string | null) => void;
} & ArtistSearchProps &
  GenreDetailSlots<O> &
  GenrePlaylistTracksSlots &
  InfoPanelCurationProps &
  GenreFocusProps & {
    /** Hides the info panel behind its edge tab (controlled); only applies with `placement="regions"`. */
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
  };

const REGIONS_CLASS =
  "[--gtv-center-left:var(--layout-center-left)] [--gtv-center-right:var(--layout-center-right)] [--gtv-center-top:var(--layout-band-top)] [&_.gtv-info-panel--overlay]:[--gtv-info-panel-header-inset:0px]";

export function GenreTreeView<O extends CriteriaOverview = CriteriaOverview>({
  scope,
  handleGenreCreationAction,
  handleGenreRenameAction,
  getBackendBaseUrl,
  additionalActions,
  viewMode: controlledViewMode,
  selectedNodeId: controlledSelectedNodeId,
  onSelectedNodeIdChange,
  defaultViewport,
  onViewportChange,
  readOnly = false,
  className,
  showDisplayOptions = true,
  showAddRoot = true,
  allowWheelRotation: controlledAllowWheelRotation,
  criteriaOverviewSchema,
  renderGenreDetailExtras,
  controlsOrientation = "horizontal",
  renderArtistLink,
  artistUuid: controlledArtistUuid,
  onArtistUuidChange,
  artistSearch = true,
  onArtistSelect,
  artistSearchBaseUrl,
  renderSummary,
  renderEssentialTracks,
  renderSongLeading,
  renderSongActions,
  renderTracksToolbar,
  editMode,
  onEditModeChange,
  renderTitleEditor,
  renderParentsEditor,
  renderDangerZone,
  expanded,
  onExpandedChange,
  collapsed,
  onCollapsedChange,
  overlayPanel,
  placement = "default",
  ...focus
}: GenreTreeViewProps<O>) {
  const {
    isLoading,
    genrePlaylistByNodeId,
    visibleGenrePlaylists,
    groupedGenrePlaylistsByRoot,
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
    selectedNodeId: controlledSelectedNodeId,
    onSelectedNodeIdChange,
    criteriaOverviewSchema,
  });

  const [internalArtistUuid, setInternalArtistUuid] = useState<string | null>(null);
  const isArtistControlled = controlledArtistUuid !== undefined;
  const artistUuid = isArtistControlled ? controlledArtistUuid : internalArtistUuid;
  const changeArtist = (uuid: string | null) => {
    if (!isArtistControlled) setInternalArtistUuid(uuid);
    onArtistUuidChange?.(uuid);
  };
  const openArtist = (uuid: string) => {
    if (selectedNodeId !== null) clearSelection();
    changeArtist(uuid);
  };
  // Keyed by artist, so switching artists (including a host's back/forward) starts compact.
  const [expandedArtistUuid, setExpandedArtistUuid] = useState<string | null>(null);
  const artistBaseUrl = artistSearchBaseUrl ?? getBackendBaseUrl;
  const artistPanel = useArtistPanel({
    uuid: artistUuid,
    getBackendBaseUrl: artistBaseUrl,
    renderArtistLink:
      renderArtistLink ??
      ((artist) =>
        artist.isSpecialPurpose ? (
          artist.name
        ) : (
          <button type="button" onClick={() => openArtist(artist.uuid)} className="hover:underline">
            {artist.name}
          </button>
        )),
    expanded: artistUuid !== null && expandedArtistUuid === artistUuid,
    onExpandedChange: (on) => setExpandedArtistUuid(on ? artistUuid : null),
    onClose: () => changeArtist(null),
  });
  const activeOverlayPanel = overlayPanel ?? artistPanel;

  // An expandable overlay (e.g. an artist) takes the info panel's slot, so the edge tab drives it instead.
  const detailOverlay =
    placement === "regions" && activeOverlayPanel?.onExpandedChange ? activeOverlayPanel : undefined;
  const detailExpanded = detailOverlay ? !!detailOverlay.expanded : expanded;
  const onDetailExpandedChange = detailOverlay ? detailOverlay.onExpandedChange : onExpandedChange;
  const infoPanelCuration: InfoPanelCurationProps = {
    editMode,
    onEditModeChange,
    renderTitleEditor,
    renderParentsEditor,
    renderDangerZone,
    expanded,
    onExpandedChange,
    collapsed: placement === "regions" ? collapsed : undefined,
    hideExpandButton: placement === "regions" ? true : undefined,
    overlayPanel: detailOverlay ? { ...detailOverlay, collapsed, hideExpandButton: true } : activeOverlayPanel,
  };

  const rootRef = useRef<HTMLDivElement>(null);
  const handlePrevious = () => {
    rootRef.current?.querySelector<HTMLButtonElement>(".search-overlay .gtv-info-panel-previous")?.click();
  };

  const { showPopup, hidePopup } = usePopup();
  const [searchText, setSearchText] = useState("");
  const artistSearchResult = useArtistSearch(artistBaseUrl, artistSearch ? searchText : "");
  const artistExtraResults: GenreSearchProps["extraResults"] = artistSearch
    ? {
        label: "Artists",
        items: artistSearchResult.artists.map((artist) => ({
          key: artist.uuid,
          content: (
            <>
              <span className="block truncate font-medium">
                {artist.name}
                {artist.disambiguation && (
                  <span className="font-normal text-[var(--color-neutral-500)]"> · {artist.disambiguation}</span>
                )}
              </span>
              {artist.matchedAlias && (
                <span className="block truncate text-xs text-[var(--color-neutral-500)]">
                  also known as {artist.matchedAlias}
                </span>
              )}
            </>
          ),
          onSelect: () => {
            openArtist(artist.uuid);
            onArtistSelect?.(artist);
          },
        })),
        status: artistSearchResult.isError
          ? "Search failed"
          : artistSearchResult.settled && artistSearchResult.artists.length === 0
            ? "No artists found"
            : "",
      }
    : undefined;
  const handleSelectedNodeChange = (node: { id: string } | null) => {
    if (node && artistUuid !== null) changeArtist(null);
    selectNode(node);
  };
  const handleGenreSearchClear = clearSelection;
  const handleGenreSearchSelect = (genrePlaylist: CriteriaPlaylistSimple) => {
    if (artistUuid !== null) changeArtist(null);
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

  // Stable across selections: the overview fetch lives in GenreDetailExtras, so its loading
  // states re-render only the info panel, never the tree.
  const renderExtraDetails = useCallback(
    (node: GenreTreeNode): ReactNode => {
      const genrePlaylist = genrePlaylistByNodeId.get(node.id);
      const criteria = genrePlaylist?.criteria;
      if (!genrePlaylist || !criteria) return null;
      const genreUuid = criteria.uuid;
      return (
        <>
          <GenreNodeActionBand
            node={node}
            genrePlaylist={genrePlaylist}
            scope={scope}
            onZoomIn={zoomInRef.current}
            onAddChild={readOnly ? undefined : () => handleGenreCreationAction(criteria)}
            onRename={readOnly ? undefined : () => handleGenreRenameAction(criteria)}
            onChangeParent={
              readOnly
                ? undefined
                : () =>
                    showPopup(
                      <ChangeParentPopup
                        genrePlaylist={{ ...genrePlaylist, criteria }}
                        genrePlaylists={visibleGenrePlaylists}
                        scope={scope}
                        getBackendBaseUrl={getBackendBaseUrl}
                        onClose={hidePopup}
                      />,
                    )
            }
            additionalActions={additionalActions}
          />
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
          renderSongLeading={renderSongLeading}
          renderSongActions={renderSongActions}
          renderTracksToolbar={renderTracksToolbar}
        />
        </>
      );
    },
    [genrePlaylistByNodeId, additionalActions, readOnly, handleGenreCreationAction, handleGenreRenameAction,
      showPopup, hidePopup, visibleGenrePlaylists,
      scope, getBackendBaseUrl, criteriaOverviewSchema,
      renderGenreDetailExtras,
      renderArtistLink,
      renderSummary,
      renderEssentialTracks,
      renderSongLeading,
      renderSongActions,
      renderTracksToolbar,
    ],
  );

  const isRotationControlled = controlledAllowWheelRotation !== undefined;
  const allowWheelRotation = controlledAllowWheelRotation ?? internalAllowWheelRotation;

  const detailTab =
    placement === "regions" && (selectedNodeId || detailOverlay) && onCollapsedChange ? (
      <PanelEdgeTab
        side="left"
        edge={
          detailExpanded
            ? { label: "Shrink panel", onClick: () => onDetailExpandedChange?.(false) }
            : collapsed
              ? null
              : { label: "Hide panel", onClick: () => onCollapsedChange(true) }
        }
        center={
          detailExpanded
            ? null
            : collapsed
              ? { label: "Show panel", onClick: () => onCollapsedChange(false) }
              : onDetailExpandedChange
                ? { label: "Extend panel", onClick: () => onDetailExpandedChange(true) }
                : null
        }
      />
    ) : null;

  const actions = (
    <>
      {!isLoading && (
        <GenreSearch
          genrePlaylists={visibleGenrePlaylists}
          onSelect={handleGenreSearchSelect}
          selectedName={selectedGenrePlaylist?.name ?? null}
          onClear={handleGenreSearchClear}
          onPrevious={handlePrevious}
          onQueryChange={artistSearch ? setSearchText : undefined}
          extraResults={artistExtraResults}
        />
      )}
      {!isLoading && !isControlled && (
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
      {!isLoading && showDisplayOptions && (
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
      {!isLoading && !readOnly && showAddRoot && (
        <IconTextButton
          icon={Plus}
          text="Add root"
          onClick={() => handleGenreCreationAction(null)}
        />
      )}
    </>
  );

  return (
    <div
      ref={rootRef}
      className={["genre-tree-view relative flex flex-col h-full", placement === "regions" && REGIONS_CLASS, className]
        .filter(Boolean)
        .join(" ")}
    >
      <style>{PREVIOUS_BUTTON_CSS}</style>
      <div
        className={`actions-container absolute z-30 flex items-center gap-2 ${
          placement === "regions"
            ? "left-[calc(var(--layout-gutter)+var(--layout-panel-inset))] top-[calc(var(--layout-gutter)+var(--layout-panel-inset))]"
            : "left-5 top-5"
        }`}
      >
        {actions}
      </div>
      {detailTab && (
        <div
          className={`absolute top-1/2 z-30 -translate-y-1/2 ${
            detailExpanded
              ? "right-[calc(var(--layout-center-right)-var(--layout-edge-tab-w))]"
              : collapsed
                ? "left-0"
                : "left-[calc(var(--layout-gutter)+var(--layout-left-w))]"
          }`}
        >
          {detailTab}
        </div>
      )}
      <div className="content-container flex-1 min-h-0 flex flex-row gap-4">
        <div className="tree-view-container flex-1 min-w-0 flex flex-col h-full">
          {isLoading ? (
            <GenreTreeViewSkeleton viewMode={viewMode} />
          ) : viewMode === "wheel" ? (
            // The info panel's top edge aligns with the tree's; the search bar floats `--layout-panel-inset` below it,
            // and the header inset (the bar's height plus that inset) extends the header's fill behind the bar,
            // Google Maps style; the 8px bottom padding mirrors the inset above the bar, and the hidden title's height is zeroed.
            // The panel's own Zoom in button is hidden: the search bar carries it.
            <div className="tree-container search-overlay relative flex-1 w-full min-h-0 [--gtv-info-panel-header-inset:calc(var(--layout-search-h,2.5rem)+var(--layout-panel-inset,0.5rem))] [&_.gtv-info-panel-header]:pb-2 [&_.gtv-info-panel-title--hidden]:h-0 [&_.gtv-toolbar]:hidden">
              <GenreTreeWheelHandoff skeleton={<GenreTreeWheelSkeleton />}>
                <GenrePlaylistTreeWheel
                  scope={scope}
                  genrePlaylists={visibleGenrePlaylists}
                  handleGenreCreationAction={handleGenreCreationAction}
                  handleGenreRenameAction={handleGenreRenameAction}
                  additionalActions={additionalActions}
                  onSelectedNodeChange={handleSelectedNodeChange}
                  hideInfoPanelClose
                  hideInfoPanelTitle
                  onNodeHover={handleNodeHover}
                  renderExtraDetails={renderExtraDetails}
                  selectedNodeId={selectedNodeId}
                  readOnly={readOnly}
                  allowWheelRotation={allowWheelRotation}
                  controlsOrientation={controlsOrientation}
                  defaultViewport={defaultViewport}
                  onViewportChange={onViewportChange}
                  {...infoPanelCuration}
                />
              </GenreTreeWheelHandoff>
            </div>
          ) : viewMode === "pop-core" ? (
            // Same as the wheel: the header inset extends its fill behind the floating search bar, Google Maps style.
            <div className="tree-container search-overlay relative flex-1 w-full min-h-0 [--gtv-info-panel-header-inset:calc(var(--layout-search-h,2.5rem)+var(--layout-panel-inset,0.5rem))] [&_.gtv-info-panel-header]:pb-2 [&_.gtv-info-panel-title--hidden]:h-0 [&_.gtv-toolbar]:hidden [&_.gtv-info-panel-zoom-in]:hidden">
              <GenreTreeWheelHandoff skeleton={<GenreTreeWheelSkeleton />}>
                <GenrePlaylistTreeWheelRadialPopCore
                  scope={scope}
                  genrePlaylists={visibleGenrePlaylists}
                  handleGenreCreationAction={handleGenreCreationAction}
                  handleGenreRenameAction={handleGenreRenameAction}
                  additionalActions={additionalActions}
                  onSelectedNodeChange={handleSelectedNodeChange}
                  hideInfoPanelClose
                  hideInfoPanelTitle
                  onNodeHover={handleNodeHover}
                  renderExtraDetails={renderExtraDetails}
                  selectedNodeId={selectedNodeId}
                  readOnly={readOnly}
                  allowWheelRotation={allowWheelRotation}
                  controlsOrientation={controlsOrientation}
                  defaultViewport={defaultViewport}
                  onViewportChange={onViewportChange}
                  {...infoPanelCuration}
                  {...focus}
                />
              </GenreTreeWheelHandoff>
            </div>
          ) : viewMode === "outline" ? (
            <div className="tree-container flex-1 min-h-0 w-full overflow-y-auto relative [--gtv-info-panel-header-inset:calc(var(--layout-search-h,2.5rem)+var(--layout-panel-inset,0.5rem)+0.75rem)] [&_.gtv-toolbar]:hidden">
              <GenrePlaylistTreeWheelRadialPopCore
                outline
                scope={scope}
                genrePlaylists={visibleGenrePlaylists}
                handleGenreCreationAction={handleGenreCreationAction}
                handleGenreRenameAction={handleGenreRenameAction}
                additionalActions={additionalActions}
                onSelectedNodeChange={handleSelectedNodeChange}
                hideInfoPanelClose
                hideInfoPanelTitle
                onNodeHover={handleNodeHover}
                renderExtraDetails={renderExtraDetails}
                selectedNodeId={selectedNodeId}
                readOnly={readOnly}
                {...infoPanelCuration}
              />
            </div>
          ) : (
            <div className="tree-container relative flex flex-col gap-4 w-full pt-14 overflow-x-auto overflow-y-auto text-[var(--color-text)] [&_.gtv-toolbar]:hidden">
              {Object.entries(groupedGenrePlaylistsByRoot).map(
                ([uuid, genrePlaylistTreePerRoot], rootIndex) => {
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
                          hideInfoPanelClose
                          hideInfoPanelTitle
                          onNodeHover={handleNodeHover}
                          renderExtraDetails={renderExtraDetails}
                          // Each root has its own panel; null closes the one not holding the selection.
                          selectedNodeId={
                            uuid === selectedGenrePlaylist?.root.uuid ? selectedNodeId : null
                          }
                          readOnly={readOnly}
                          wheelZoom="modifier"
                          controlsOrientation={controlsOrientation}
                          defaultViewport={
                            uuid === selectedGenrePlaylist?.root.uuid ? defaultViewport : undefined
                          }
                          onViewportChange={
                            uuid === selectedGenrePlaylist?.root.uuid ? onViewportChange : undefined
                          }
                          {...infoPanelCuration}
                          // Every tree draws its own overlay; render it once, not per root.
                          overlayPanel={rootIndex === 0 ? activeOverlayPanel : undefined}
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
