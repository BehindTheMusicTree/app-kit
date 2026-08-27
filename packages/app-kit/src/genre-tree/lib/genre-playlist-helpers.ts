import type { GenreTreeNode } from "@behindthemusictree/genre-tree-view";

import { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";

export const getGenrePlaylistsGroupedByRoot = (genrePlaylists: CriteriaPlaylistSimple[]) =>
  genrePlaylists.reduce<Record<string, CriteriaPlaylistSimple[]>>((acc, playlist) => {
    const rootUuid = playlist.root.uuid;
    if (!acc[rootUuid]) acc[rootUuid] = [];
    acc[rootUuid].push(playlist);
    return acc;
  }, {});

/** Whether `nodes` contains a root node (`parentId === null`) named exactly "Mainstream Pop" —
 * the precondition `GenreTreeWheelRadialPopCore` requires before rendering. */
export const hasMainstreamPopRoot = (nodes: GenreTreeNode[]): boolean =>
  nodes.some((node) => node.parentId === null && node.name === "Mainstream Pop");
