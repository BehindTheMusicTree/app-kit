"use client";

import { useMemo } from "react";
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

  const selectGenre = (nodeId: string) => onSelectGenre(nodeId as GenreUuid);
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

  return (
    <DetailPanel
      side="left"
      title={view.node.name}
      headerAccent={{ background: view.fill, color: ACCENT_TEXT_COLOR }}
      headerActions={
        onExpandedChange ? (
          <IconButton
            aria-label={expanded ? "Shrink panel" : "Extend panel"}
            style={{ color: "inherit" }}
            onClick={() => onExpandedChange(!expanded)}
          >
            {expanded ? (
              <Minimize2 aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Maximize2 aria-hidden="true" className="h-4 w-4" />
            )}
          </IconButton>
        ) : undefined
      }
      onClose={onClose}
      collapsed={collapsed}
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      aside={ancestors}
    >
      <GenreInfoPanelBody<O>
        family={family}
        genreUuid={detail.uuid}
        genrePlaylist={{ ...detail.criteriaPlaylist, tracksCount: detail.tracksCount }}
        wikidataId={detail.wikidataId}
        scope={scope}
        getBackendBaseUrl={getBackendBaseUrl}
        playback={playback}
        band={{ node: view.node, onZoomIn, shareUrl, shareTarget: shareUrl ? shareTarget : undefined }}
        extras={extras}
      />
      {!expanded && ancestors}
    </DetailPanel>
  );
}
