import { z } from "zod";
import { GenreCatalogueCountsSchema, GenrePlaylistSummarySchema } from "../genre-music";

import { GenreUuidSchema } from "../ids";
import { CriteriaMinimumSchema } from "./minimum";
import { CriteriaPlaylistMinimumSchema } from "../criteria-playlist/minimum";
import { TrackMinimumSchema } from "../track/minimum";
import { CriteriaLineageRelWithoutAscendantSchema } from "./lineage-rel/without-ascendant";
import { CriteriaLineageRelWithoutDescendantSchema } from "./lineage-rel/without-descendant";

export const CriteriaDetailedSchema = z.object({
  uuid: GenreUuidSchema,
  name: z.string(),
  summary: z.string().nullable(),
  // Optional until every deployed API serves it.
  wikidataId: z.string().nullable().optional(),
  parent: CriteriaMinimumSchema.nullable(),
  ascendants: z.array(CriteriaLineageRelWithoutDescendantSchema),
  descendants: z.array(CriteriaLineageRelWithoutAscendantSchema).optional(),
  root: CriteriaMinimumSchema,
  children: z.array(CriteriaMinimumSchema),
  catalogue: GenreCatalogueCountsSchema.optional(),
  criteriaPlaylist: z.union([GenrePlaylistSummarySchema, CriteriaPlaylistMinimumSchema]).nullable(),
  tracks: z.array(TrackMinimumSchema).optional(),
  essentialSongs: z.array(TrackMinimumSchema),
  tracksCount: z.number(),
  updatedOn: z.string().datetime().nullable(),
});

export type CriteriaDetailed = z.infer<typeof CriteriaDetailedSchema>;
