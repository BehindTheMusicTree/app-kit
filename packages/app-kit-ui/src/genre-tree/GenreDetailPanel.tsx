"use client";

import { useMemo, type ReactNode, type ComponentProps } from "react";
import {
  ACCENT_TEXT_COLOR,
  GenreNodeAncestors,
  GenreNodeFamily,
  getGenreTreeColor,
  TEXT_COLOR,
  tintSurface,
  type GenreTreeNode,
  type InfoPanelChild,
} from "@behindthemusictree/genre-tree-view";
import { DetailPanel, IconButton, Skeleton } from "@behindthemusictree/ui";
import { Maximize2, Minimize2 } from "lucide-react";

import {
  useFetchGenreDetail,
  genreMusicCount,
  GenrePlaylistSummarySchema,
  GenreCatalogueCountsSchema,
  CriteriaMinimumSchema,
  type CriteriaPlaylistSimple,
  type CriteriaMinimum,
  type CriteriaOverview,
  type GenreUuid,
  GenreUuidSchema,
} from "@behindthemusictree/app-kit/genre-tree";
import type { Scope } from "@behindthemusictree/app-kit/transport";

import { GenreInfoPanelBody, type GenreInfoPanelBodyProps } from "./GenreInfoPanelBody";
import type { GenreTreeShareTarget } from "./share";
import { useGenrePlaylistPlayback } from "./playlist-tree/useGenrePlaylistPlayback";

export type GenreDetailPanelProps<O extends CriteriaOverview> = {
  genreUuid: GenreUuid;
  scope: Scope;
  getBackendBaseUrl: () => string;
  onClose: () => void;
  /** Fired with the uuid of a family or ancestor chip the user picked. */
  onSelectGenre: (genreUuid: GenreUuid) => void;
  /** When set, the panel offers "Focus". */
  onZoomIn?: () => void;
  /** Absolute or relative URL that shares this genre; the share action shows only when set. */
  shareUrl?: string;
  shareTarget?: GenreTreeShareTarget;
  collapsed?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Tab on the panel's inner edge, for hosts that hide and show the panel. */
  edgeTab?: ComponentProps<typeof DetailPanel>["edgeTab"];
  extras?: GenreInfoPanelBodyProps<O>["extras"];
  /** The host's search field shows this genre's name and closes the panel. */
  titleInSearch?: boolean;
};

// Relatives from the detail endpoint carry no song count, so the family dots share one size.
const RELATIVE_ITEM_COUNT = 1;

function toNode(genre: CriteriaMinimum, parentId: string | null): GenreTreeNode {
  return {
    id: genre.uuid,
    parentId,
    name: genre.name,
    itemCount: RELATIVE_ITEM_COUNT,
    side: genre.side ?? undefined,
    wikidataId: genre.wikidataId,
  };
}

type GenreDetailContentOptions<O extends CriteriaOverview> = {
  genreUuid: GenreUuid | null;
  scope: Scope;
  getBackendBaseUrl: () => string;
  onSelectGenre: (uuid: GenreUuid) => void;
  extras?: GenreInfoPanelBodyProps<O>["extras"];
  band?: Partial<GenreInfoPanelBodyProps<O>["band"]>;
  playback?: GenreInfoPanelBodyProps<O>["playback"];
  trailing?: ReactNode;
  genrePlaylist?: CriteriaPlaylistSimple;
  expanded?: boolean;
};

/** Shared entity data and content; the host owns the panel shell and placement. */
export function useGenreDetailContent<O extends CriteriaOverview>({
  genreUuid, scope, getBackendBaseUrl, onSelectGenre, extras, band, playback: hostPlayback, trailing, genrePlaylist: hostPlaylist, expanded,
}: GenreDetailContentOptions<O>) {
  const { data: detail, isPending, isError } = useFetchGenreDetail(genreUuid, scope, getBackendBaseUrl);
  const defaultPlayback = useGenrePlaylistPlayback({ scope, genrePlaylists: [], artist: extras?.artist });
  const playback = hostPlayback ?? defaultPlayback;

  const view = useMemo(() => {
    if (!detail) return null;
    const rootColor = getGenreTreeColor(detail.root.wikidataId);
    const relative = (genre: CriteriaMinimum, parentId: string | null): InfoPanelChild => ({
      node: toNode(genre, parentId),
      fill: tintSurface(rootColor),
      textColor: TEXT_COLOR,
    });
    const ancestors = [...detail.ascendants].sort((a, b) => b.degree - a.degree);
    return {
      node: {
        id: detail.uuid,
        parentId: detail.parent?.uuid ?? null,
        name: detail.name,
        itemCount: scope === "reference" ? genreMusicCount(detail.criteriaPlaylist ? GenrePlaylistSummarySchema.parse(detail.criteriaPlaylist) : GenreCatalogueCountsSchema.parse(detail.catalogue)) : detail.tracksCount,
        wikidataId: detail.wikidataId,
      } satisfies GenreTreeNode,
      fill: rootColor,
      parentNode: detail.parent ? relative(detail.parent, null) : null,
      childNodes: detail.children.map((child) => relative(child, detail.uuid)),
      ancestorNodes: ancestors.map(({ ascendant }, index) =>
        relative(ascendant, index === 0 ? null : ancestors[index - 1].ascendant.uuid),
      ),
    };
  }, [detail, scope]);

  if (isError) return {
    name: null,
    title: "Genre unavailable",
    content: <p role="alert" className="p-4 text-body text-[var(--color-text)]">This genre could not be loaded.</p>,
  };
  if (isPending || !detail || !view) return {
    name: null,
    title: "Loading genre…",
    content: <div className="flex flex-col gap-3 p-4" aria-busy="true" data-testid="genre-detail-panel-skeleton">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>,
  };

  const selectGenre = (nodeId: string) => onSelectGenre(GenreUuidSchema.parse(nodeId));
  const family = (
    <GenreNodeFamily
      node={view.node}
      fill={view.fill}
      textColor={ACCENT_TEXT_COLOR}
      parentNode={view.parentNode}
      childNodes={view.childNodes}
      onSelectNode={selectGenre}
    />
  );
  const ancestors = <GenreNodeAncestors ancestorNodes={view.ancestorNodes} onSelectNode={selectGenre} />;

  return {
    name: detail.name,
    title: detail.name,
    headerAccent: { background: view.fill, color: ACCENT_TEXT_COLOR },
    aside: expanded ? ancestors : undefined,
    content: <>
      <GenreInfoPanelBody<O>
        family={<>{family}{!expanded && ancestors}</>}
        genreUuid={detail.uuid}
        genrePlaylist={hostPlaylist ?? (detail.criteriaPlaylist === null ? null : scope === "reference" ? { ...GenrePlaylistSummarySchema.parse(detail.criteriaPlaylist), criteria: CriteriaMinimumSchema.parse(detail) } : { ...detail.criteriaPlaylist, criteria: CriteriaMinimumSchema.parse(detail), tracksCount: detail.tracksCount })}
        catalogue={detail.catalogue}
        wikidataId={detail.wikidataId}
        scope={scope}
        getBackendBaseUrl={getBackendBaseUrl}
        playback={playback}
        band={{ node: view.node, ...band, shareTarget: band?.shareTarget?.kind === "genre" ? { ...band.shareTarget, name: detail.name } : band?.shareTarget }}
        extras={extras}
      />
      {trailing}
    </>,
  };
}

export function GenreDetailPanel<O extends CriteriaOverview>({
  genreUuid, scope, getBackendBaseUrl, onClose, onSelectGenre, onZoomIn,
  shareUrl, shareTarget, collapsed, expanded, onExpandedChange, edgeTab, extras, titleInSearch,
}: GenreDetailPanelProps<O>) {
  const panel = useGenreDetailContent({
    genreUuid, scope, getBackendBaseUrl, onSelectGenre, extras, expanded,
    band: { onZoomIn, shareUrl, shareTarget: shareUrl ? shareTarget : undefined },
  });
  return (
    <DetailPanel side="left" title={panel.title} headerAccent={panel.headerAccent}
      onClose={onClose} collapsed={collapsed} expanded={expanded}
      onExpandedChange={onExpandedChange} edgeTab={edgeTab} aside={panel.aside} titleInSearch={titleInSearch}
      headerActions={onExpandedChange ? <IconButton aria-label={expanded ? "Shrink panel" : "Extend panel"} onClick={() => onExpandedChange(!expanded)}>
        {expanded ? <Minimize2 aria-hidden="true" className="h-4 w-4" /> : <Maximize2 aria-hidden="true" className="h-4 w-4" />}
      </IconButton> : undefined}
    >
      {panel.content}
    </DetailPanel>
  );
}
