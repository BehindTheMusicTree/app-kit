import { z } from "zod";

import { CriteriaPlaylistMinimumSchema } from "./criteria-playlist/minimum";

const CountSchema = z.number().int().nonnegative();

export const SubgenreCountsSchema = z.union([
  z.object({ canonical: CountSchema, regional: CountSchema, all: CountSchema }).strict(),
  z.object({ all: CountSchema }).strict(),
]).refine(
  (counts) => !("canonical" in counts) || (counts.all >= counts.canonical && counts.all >= counts.regional),
  "The combined count must include both scoped selections",
);

export const GenreCountsSchema = z.object({
  genreOnlyTracksCount: CountSchema,
  genreAndSubgenresTracksCount: SubgenreCountsSchema,
});

const includesDirectSongs = (counts: z.infer<typeof GenreCountsSchema>) =>
  Object.values(counts.genreAndSubgenresTracksCount).every((count) => count >= counts.genreOnlyTracksCount);

export const GenreCatalogueCountsSchema = GenreCountsSchema
  .refine(includesDirectSongs, "Every inclusive count must include the genre itself")
  .brand<"GenreCatalogueCounts">();

export const GenrePlaylistSummarySchema = CriteriaPlaylistMinimumSchema.extend(GenreCountsSchema.shape)
  .refine(includesDirectSongs, "Every inclusive count must include the genre itself")
  .brand<"GenrePlaylistSummary">();

export const GenreCoverageSchema = z.enum(["genreOnly", "genreAndSubgenres"]);
export const SubgenreScopeSchema = z.enum(["canonical", "regional", "all"]);

export type GenreCatalogueCounts = z.infer<typeof GenreCatalogueCountsSchema>;
export type GenrePlaylistSummary = z.infer<typeof GenrePlaylistSummarySchema>;
export type GenreCoverage = z.infer<typeof GenreCoverageSchema>;
export type SubgenreScope = z.infer<typeof SubgenreScopeSchema>;
