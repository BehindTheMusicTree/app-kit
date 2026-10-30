import type { CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";

export type GenreTreeSizeMetric = "songs" | "views";

export const hasViewsCount = (genrePlaylists: CriteriaPlaylistSimple[]): boolean =>
  genrePlaylists.every((genrePlaylist) => genrePlaylist.viewsCount !== undefined);

export const genrePlaylistSize = (genrePlaylist: CriteriaPlaylistSimple, metric: GenreTreeSizeMetric): number => {
  if (metric === "songs") return genrePlaylist.tracksCount;
  if (genrePlaylist.viewsCount === undefined) {
    throw new Error(`Genre playlist ${genrePlaylist.uuid} has no viewsCount to size by views`);
  }
  return genrePlaylist.viewsCount;
};
