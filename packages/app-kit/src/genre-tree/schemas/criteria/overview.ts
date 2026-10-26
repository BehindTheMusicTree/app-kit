import { z } from "zod";

import { UuidResourceSchema } from "../uuid-resource";
import { TrackMinimumSchema } from "../track/minimum";

export const CriteriaOverviewSchema = UuidResourceSchema.extend({
  name: z.string(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  summarySourceUrl: z.string().url().nullable(),
  essentialSongs: z.array(TrackMinimumSchema).optional(),
});

export type CriteriaOverview = z.infer<typeof CriteriaOverviewSchema>;
