import type { InfiniteData } from "@tanstack/react-query";

type SongsPage = { tracks: unknown[]; total: number | null };

/**
 * Applies an optimistic edit to the cached infinite query
 * `libraryQueryKeys.reference.songs.byGenre(baseUrl, genreUuid)`: pages are `{ tracks, total, nextPage }`.
 * `edit` maps a page's tracks (return fewer to remove, changed copies to update); every page's `total` (a list-wide count) follows the
 * overall removed/added count. Use as `queryClient.setQueryData(key, (data) => editGenreSongPages(data, edit))`.
 */
export function editGenreSongPages<P extends SongsPage>(
  data: InfiniteData<P> | undefined,
  edit: (tracks: P["tracks"]) => P["tracks"],
): InfiniteData<P> | undefined {
  if (!data) return data;
  const edited = data.pages.map((page) => edit(page.tracks));
  const delta = edited.reduce((sum, tracks, i) => sum + tracks.length - data.pages[i].tracks.length, 0);
  return {
    ...data,
    pages: data.pages.map((page, i) => ({
      ...page,
      tracks: edited[i],
      total: page.total === null ? null : page.total + delta,
    })),
  };
}
