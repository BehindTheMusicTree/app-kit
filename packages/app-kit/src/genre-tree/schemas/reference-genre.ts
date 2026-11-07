import { z } from "zod";
import { CriteriaDetailedSchema } from "./criteria/detailed";
import { CriteriaPlaylistSimpleSchema } from "./criteria-playlist/simple";
import { GenreCatalogueCountsSchema, GenreCountsSchema, GenrePlaylistSummarySchema } from "./genre-music";

export const ReferenceGenreDetailedSchema = CriteriaDetailedSchema.extend({
  catalogue: GenreCatalogueCountsSchema,
  criteriaPlaylist: GenrePlaylistSummarySchema,
});

export const ReferenceGenrePlaylistSchema = CriteriaPlaylistSimpleSchema.extend({
  ...GenreCountsSchema.shape,
  catalogue: GenreCatalogueCountsSchema,
}).superRefine((playlist, ctx) => {
  const counts = GenreCatalogueCountsSchema.safeParse(playlist);
  if (!counts.success) for (const issue of counts.error.issues) ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
});

export type ReferenceGenreDetailed = z.infer<typeof ReferenceGenreDetailedSchema>;
export type ReferenceGenrePlaylist = z.infer<typeof ReferenceGenrePlaylistSchema>;
