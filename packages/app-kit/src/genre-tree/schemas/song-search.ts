import { z } from "zod";

import { ArtistMinimumSchema } from "./artist-minimum";
import { CriteriaMinimumSchema } from "./criteria/minimum";

export const SongSearchResultSchema = z.object({
  uuid: z.string().uuid(),
  title: z.string(),
  artists: z.array(ArtistMinimumSchema),
  // null for songs not yet linked to a genre.
  genre: CriteriaMinimumSchema.nullable(),
  youtubeVideo: z
    .object({
      id: z.string(),
      unplayableReason: z.string().nullable(),
    })
    .nullable(),
  firstReleaseYear: z.number().int().nullable(),
});

export const SongSearchResultsSchema = z.array(SongSearchResultSchema);

export type SongSearchResult = z.infer<typeof SongSearchResultSchema>;

export type SongSearchGenreFilter = "any" | "with" | "without";

export interface SongSearchParams {
  q: string;
  limit?: number;
  genre?: SongSearchGenreFilter;
  playable?: boolean;
}

/** A song is playable when it has a video with no unplayable reason. */
export function isSongSearchResultPlayable(result: SongSearchResult): boolean {
  return result.youtubeVideo !== null && result.youtubeVideo.unplayableReason === null;
}
