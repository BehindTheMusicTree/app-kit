import { z } from "zod";

import { GenreUuidSchema } from "../ids";
import { TrackMinimumSchema } from "../track/minimum";

export const CriteriaOverviewSchema = z.object({
  uuid: GenreUuidSchema,
  name: z.string(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  summarySourceUrl: z.string().url().nullable(),
  essentialSongs: z.array(TrackMinimumSchema).optional(),
});

export type CriteriaOverview = z.infer<typeof CriteriaOverviewSchema>;
