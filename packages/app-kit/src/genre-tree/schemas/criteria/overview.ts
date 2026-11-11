import { z } from "zod";

import { CommonsImageSchema } from "../commons-image";
import { HttpUrlSchema } from "../http-url";
import { GenreUuidSchema } from "../ids";
import { TrackMinimumSchema } from "../track/minimum";

export const CriteriaOverviewSchema = z.object({
  uuid: GenreUuidSchema,
  name: z.string(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  summarySourceUrl: HttpUrlSchema.nullable(),
  // Optional: hosts whose API does not send it (e.g. hear) stay valid.
  image: CommonsImageSchema.nullable().optional(),
  essentialSongs: z.array(TrackMinimumSchema).optional(),
});

export type CriteriaOverview = z.infer<typeof CriteriaOverviewSchema>;
