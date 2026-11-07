import { z } from "zod";
import { GenreCatalogueCountsSchema, GenreCountsSchema } from "./genre-music";
import { GenrePlaylistUuidSchema } from "./ids";

/** One non-zero node of an artist's footprint on the canonical genre tree. */
export const ArtistGenreCountSchema = z.object({
  ...GenreCountsSchema.shape,
  catalogue: GenreCatalogueCountsSchema,
  genrePlaylist: GenrePlaylistUuidSchema,
  /** Legacy catalogue count for the default selection. */
  songsCount: z.number().int().nonnegative(),
  /** Legacy playlist count for the default selection. */
  tracksCount: z.number().int().nonnegative(),
}).superRefine((row, ctx) => {
  const counts = GenreCatalogueCountsSchema.safeParse(row);
  if (!counts.success) {
    for (const issue of counts.error.issues) {
      ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
    }
  }
});

export type ArtistGenreCount = z.infer<typeof ArtistGenreCountSchema>;
