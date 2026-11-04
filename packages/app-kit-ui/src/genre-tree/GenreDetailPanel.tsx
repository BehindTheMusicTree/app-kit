"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  ACCENT_TEXT_COLOR,
  getGenreTreeColor,
  InfoPanel,
  TEXT_COLOR,
  tintSurface,
  type GenreTreeNode,
  type InfoPanelChild,
} from "@behindthemusictree/genre-tree-view";
import { Skeleton } from "@behindthemusictree/ui";

import {
  useFetchGenreDetail,
  type CriteriaMinimum,
  type CriteriaOverview,
  type GenreUuid,
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
  extras?: GenreInfoPanelBodyProps<O>["extras"];
};

const ITEM_COUNT_LABEL = "Songs";
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

/** A genre's detail panel driven by one uuid, with no tree behind it. The tree's own panel shares its body. */
export function GenreDetailPanel<O extends CriteriaOverview>({
  genreUuid,
  scope,
  getBackendBaseUrl,
  onClose,
  onSelectGenre,
  onZoomIn,
  shareUrl,
  shareTarget,
  collapsed,
  expanded,
  onExpandedChange,
  extras,
}: GenreDetailPanelProps<O>) {
  const { data: detail, isPending, isError } = useFetchGenreDetail(genreUuid, scope, getBackendBaseUrl);
  const playback = useGenrePlaylistPlayback({ scope, genrePlaylists: [] });

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
        itemCount: detail.tracksCount,
        wikidataId: detail.wikidataId,
      } satisfies GenreTreeNode,
      fill: rootColor,
      parentNode: detail.parent ? relative(detail.parent, null) : null,
      childNodes: detail.children.map((child) => relative(child, detail.uuid)),
      ancestorNodes: ancestors.map(({ ascendant }, index) =>
        relative(ascendant, index === 0 ? null : ancestors[index - 1].ascendant.uuid),
      ),
    };
  }, [detail]);

  if (isError) {
    return (
      <div role="alert" className="p-4 text-sm text-[var(--color-text)]">
        This genre could not be loaded.
      </div>
    );
  }
  if (isPending || !detail || !view) {
    return (
      <div className="flex flex-col gap-3 p-4" aria-busy="true" data-testid="genre-detail-panel-skeleton">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  const renderBody = (node: GenreTreeNode, sections: { toolbar: ReactNode; family: ReactNode }) => ({
    primary: (
      <GenreInfoPanelBody<O>
        toolbar={sections.toolbar}
        family={sections.family}
        genreUuid={detail.uuid}
        genrePlaylist={{ ...detail.criteriaPlaylist, tracksCount: detail.tracksCount }}
        wikidataId={detail.wikidataId}
        scope={scope}
        getBackendBaseUrl={getBackendBaseUrl}
        playback={playback}
        band={{ node, onZoomIn, shareUrl, shareTarget: shareUrl ? shareTarget : undefined }}
        extras={extras}
      />
    ),
    aside: null,
  });

  return (
    <InfoPanel
      node={view.node}
      fill={view.fill}
      textColor={ACCENT_TEXT_COLOR}
      parentNode={view.parentNode}
      childNodes={view.childNodes}
      ancestorNodes={view.ancestorNodes}
      side="left"
      onClose={onClose}
      onSelectNode={(nodeId) => onSelectGenre(nodeId as GenreUuid)}
      itemCountLabel={ITEM_COUNT_LABEL}
      renderInfoPanelBody={renderBody}
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      collapsed={collapsed}
      hideExpandButton={onExpandedChange === undefined}
    />
  );
}
