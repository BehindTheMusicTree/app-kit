import { z } from "zod";

import { UuidResourceSchema } from "../uuid-resource";
import { CriteriaMinimumSchema } from "../criteria/minimum";
import { CriteriaPlaylistMinimumSchema } from "./minimum";

// Metadata only — tracks are paged separately via `genrePlaylistEndpoints.*.tracks(uuid)`.
export const CriteriaPlaylistDetailedSchema = UuidResourceSchema.extend({
  name: z.string(),
  tracksCount: z.number(),
  durationInSec: z.number().min(0).nullable().optional(),
  durationStrInHourMinSec: z.string().nullable().optional(),
  // Nullable: the "Genreless" root playlist has no criteria attached and is never updated.
  criteria: CriteriaMinimumSchema.nullable(),
  parent: CriteriaPlaylistMinimumSchema.nullable(),
  root: CriteriaPlaylistMinimumSchema,
  createdOn: z.string(),
  updatedOn: z.string().nullable(),
});

export type CriteriaPlaylistDetailed = z.infer<typeof CriteriaPlaylistDetailedSchema>;
