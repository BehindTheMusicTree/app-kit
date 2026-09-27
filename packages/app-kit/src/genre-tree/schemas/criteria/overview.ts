import { z } from "zod";

import { UuidResourceSchema } from "../uuid-resource";
import { TrackMinimumSchema } from "../track/minimum";

export const CriteriaOverviewSchema = UuidResourceSchema.extend({
  name: z.string(),
  summary: z.string().nullable(),
  essentialTracks: z.array(TrackMinimumSchema),
});

export type CriteriaOverview = z.infer<typeof CriteriaOverviewSchema>;
