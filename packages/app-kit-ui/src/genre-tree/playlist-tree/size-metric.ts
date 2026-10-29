import type { CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";

export type GenreTreeSizeMetric = "songs" | "views";

export const genrePlaylistSize = (genrePlaylist: CriteriaPlaylistSimple, metric: GenreTreeSizeMetric): number =>
  metric === "views" ? genrePlaylist.viewsCount : genrePlaylist.tracksCount;
