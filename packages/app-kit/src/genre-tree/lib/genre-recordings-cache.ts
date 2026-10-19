import type { InfiniteData } from "@tanstack/react-query";

type RecordingsPage = { tracks: unknown[]; total: number | null };

/**
 * Applies an optimistic edit to the cached infinite query
 * `libraryQueryKeys.reference.recordings.byGenre(baseUrl, genreUuid)`: pages are `{ tracks, total, nextPage }`.
 * `edit` maps a page's tracks (return fewer to remove, changed copies to update); `total` follows the
 * removed/added count. Use as `queryClient.setQueryData(key, (data) => editGenreRecordingPages(data, edit))`.
 */
export function editGenreRecordingPages<P extends RecordingsPage>(
  data: InfiniteData<P> | undefined,
  edit: (tracks: P["tracks"]) => P["tracks"],
): InfiniteData<P> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => {
      const tracks = edit(page.tracks);
      return {
        ...page,
        tracks,
        total: page.total === null ? null : page.total + tracks.length - page.tracks.length,
      };
    }),
  };
}
