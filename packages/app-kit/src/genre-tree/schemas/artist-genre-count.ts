import { z } from "zod";
import { GenrePlaylistUuidSchema } from "./ids";

/** One non-zero node of an artist's footprint on the canonical genre tree. */
export const ArtistGenreCountSchema = z.object({
  genrePlaylist: GenrePlaylistUuidSchema,
  /** All the artist's songs in the genre playlist's subtree; drives pruning. */
  songsCount: z.number().int().nonnegative(),
  /** The playable ones among them; drives node size and the play button. */
  tracksCount: z.number().int().nonnegative(),
});

export type ArtistGenreCount = z.infer<typeof ArtistGenreCountSchema>;
