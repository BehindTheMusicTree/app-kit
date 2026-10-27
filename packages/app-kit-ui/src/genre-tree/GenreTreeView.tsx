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

/** Artists are searched by default, so a host must say what picking one does, or opt out. */
export type ArtistSearchProps =
  | { artistSearch: false; onArtistSelect?: never; artistSearchBaseUrl?: never }
  | {
      artistSearch?: true;
      onArtistSelect: (artist: ArtistSearchResult) => void;
      /** Backend that serves `artists/search/`. Defaults to `getBackendBaseUrl`. */
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
  /** When true, hides the "Add root" button and suppresses per-node
   * create/rename/reparent affordances, for a read-only consumer. Defaults to false. */
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
  /** When set, artist names in the info panel's track list render through it (e.g. a router `Link`). */
  renderArtistLink?: RenderArtistLink;
} & ArtistSearchProps &
  GenreDetailSlots<O> &
  GenrePlaylistTracksSlots &
  InfoPanelCurationProps &
  GenreFocusProps;

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
  readOnly = false,
  className,
  showDisplayOptions = true,
  showAddRoot = true,
  allowWheelRotation: controlledAllowWheelRotation,
  criteriaOverviewSchema,
  renderGenreDetailExtras,
  controlsOrientation = "horizontal",
  renderArtistLink,
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
  overlayPanel,
  placement = "default",
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
    reparentingGenreUuid,
    requestReparent,
    reparent,
    isReparenting,
    onNodeHover: handleNodeHover,
  } = useGenreTreeViewState<O>({
    scope,
    getBackendBaseUrl,
    viewMode: controlledViewMode,
    selectedNodeId: controlledSelectedNodeId,
    onSelectedNodeIdChange,
    criteriaOverviewSchema,
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const handlePrevious = () => {
    rootRef.current?.querySelector<HTMLButtonElement>(".search-overlay .gtv-info-panel-previous")?.click();
  };

  const [searchText, setSearchText] = useState("");
  const artistSearchResult = useArtistSearch(artistSearchBaseUrl ?? getBackendBaseUrl, artistSearch ? searchText : "");
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
          onSelect: () => onArtistSelect?.(artist),
        })),
        status: artistSearchResult.isError
          ? "Search failed"
          : artistSearchResult.settled && artistSearchResult.artists.length === 0
            ? "No artists found"
            : "",
      }
    : undefined;
  const handleSelectedNodeChange = selectNode;
  const handleGenreSearchClear = clearSelection;
  const handleGenreSearchSelect = selectGenrePlaylist;

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
            onChangeParent={readOnly ? undefined : () => requestReparent(genrePlaylist.uuid)}
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
    [genrePlaylistByNodeId, additionalActions, readOnly, handleGenreCreationAction, handleGenreRenameAction, requestReparent,
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
          placement === "regions" ? "left-[var(--layout-gutter)] top-[var(--layout-gutter)]" : "left-5 top-5"
        }`}
      >
        {actions}
      </div>
      <div className="content-container flex-1 min-h-0 flex flex-row gap-4">
        <div className="tree-view-container flex-1 min-w-0 flex flex-col h-full">
          {isLoading ? (
            <GenreTreeViewSkeleton viewMode={viewMode} />
          ) : viewMode === "wheel" ? (
            // The info panel's top edge aligns with the tree's, 8px above the h-10 search bar at top-5;
            // the header inset (10px padding + 38px = the search bar's bottom edge) extends its fill behind the search bar,
            // Google Maps style; the 8px bottom padding mirrors the 8px above the bar, and the hidden title's height is zeroed.
            // The panel's own Zoom in button is hidden: the search bar carries it.
            <div className="tree-container search-overlay relative flex-1 w-full min-h-0 [--gtv-info-panel-header-inset:2.375rem] [&_.gtv-info-panel-header]:pb-2 [&_.gtv-info-panel-title--hidden]:h-0 [&_.gtv-toolbar]:hidden">
              <GenreTreeWheelHandoff skeleton={<GenreTreeWheelSkeleton />}>
                <GenrePlaylistTreeWheel
                  scope={scope}
                  genrePlaylists={visibleGenrePlaylists}
                  reparentingGenreUuid={reparentingGenreUuid}
                  onReparentRequest={requestReparent}
                  onReparent={isReparenting ? undefined : reparent}
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
                  {...infoPanelCuration}
                />
              </GenreTreeWheelHandoff>
            </div>
          ) : viewMode === "pop-core" ? (
            // The info panel's top edge aligns with the tree's, 8px above the h-10 search bar at top-5;
            // the header inset (8px + 40px + 4px) extends its fill behind the search bar, Google Maps style.
            <div className="tree-container search-overlay relative flex-1 w-full min-h-0 [--gtv-info-panel-header-inset:2.375rem] [&_.gtv-info-panel-header]:pb-2 [&_.gtv-info-panel-title--hidden]:h-0 [&_.gtv-toolbar]:hidden [&_.gtv-info-panel-zoom-in]:hidden">
              <GenreTreeWheelHandoff skeleton={<GenreTreeWheelSkeleton />}>
                <GenrePlaylistTreeWheelRadialPopCore
                  scope={scope}
                  genrePlaylists={visibleGenrePlaylists}
                  reparentingGenreUuid={reparentingGenreUuid}
                  onReparentRequest={requestReparent}
                  onReparent={isReparenting ? undefined : reparent}
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
                  {...infoPanelCuration}
                  {...focus}
                />
              </GenreTreeWheelHandoff>
            </div>
          ) : viewMode === "outline" ? (
            <div className="tree-container flex-1 min-h-0 w-full overflow-y-auto relative [--gtv-info-panel-header-inset:3.25rem] [&_.gtv-toolbar]:hidden">
              <GenrePlaylistTreeWheelRadialPopCore
                outline
                scope={scope}
                genrePlaylists={visibleGenrePlaylists}
                reparentingGenreUuid={reparentingGenreUuid}
                onReparentRequest={requestReparent}
                onReparent={isReparenting ? undefined : reparent}
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
                          reparentingGenreUuid={reparentingGenreUuid}
                          onReparentRequest={requestReparent}
                          onReparent={isReparenting ? undefined : reparent}
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
