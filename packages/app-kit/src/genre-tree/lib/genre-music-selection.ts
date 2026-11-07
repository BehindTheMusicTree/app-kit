import type { GenreCatalogueCounts, SubgenreScope } from "../schemas/genre-music";

export type GenreMusicSelection =
  | { coverage: "genreOnly"; subgenres?: never }
  | { coverage: "genreAndSubgenres"; subgenres: SubgenreScope };

export type GenreMusicCounts = Pick<GenreCatalogueCounts, "genreOnlyTracksCount" | "genreAndSubgenresTracksCount">;

export function defaultGenreMusicSelection(counts: GenreMusicCounts): GenreMusicSelection {
  return { coverage: "genreAndSubgenres", subgenres: "canonical" in counts.genreAndSubgenresTracksCount ? "canonical" : "all" };
}

export function genreMusicCount(counts: GenreMusicCounts, selection = defaultGenreMusicSelection(counts)): number {
  if (selection.coverage === "genreOnly") return counts.genreOnlyTracksCount;
  const scopes = counts.genreAndSubgenresTracksCount;
  if (selection.subgenres === "all") return scopes.all;
  if (!("canonical" in scopes)) throw new Error("Regional genres only support all subgenres");
  return scopes[selection.subgenres];
}

export function genreMusicQueryParams(selection?: GenreMusicSelection): Record<string, string> {
  if (!selection) return {};
  return selection.coverage === "genreOnly"
    ? { coverage: "genre_only" as const }
    : { coverage: "genre_and_subgenres" as const, subgenres: selection.subgenres };
}

export function genreMusicSelectionKey(selection?: GenreMusicSelection): readonly string[] {
  return selection ? [selection.coverage, ...(selection.coverage === "genreAndSubgenres" ? [selection.subgenres] : [])] : [];
}

/** Personal playlists keep their existing count contract; reference parsers require explicit counts. */
export function genrePlaylistTrackCount(playlist: { tracksCount: number; genreOnlyTracksCount?: number; genreAndSubgenresTracksCount?: GenreMusicCounts["genreAndSubgenresTracksCount"] }): number {
  if (playlist.genreOnlyTracksCount === undefined && playlist.genreAndSubgenresTracksCount === undefined) return playlist.tracksCount;
  if (playlist.genreOnlyTracksCount === undefined || playlist.genreAndSubgenresTracksCount === undefined) throw new Error("Incomplete genre playlist counts");
  return genreMusicCount({ genreOnlyTracksCount: playlist.genreOnlyTracksCount, genreAndSubgenresTracksCount: playlist.genreAndSubgenresTracksCount });
}
