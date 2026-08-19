import { z } from "zod";

import { UuidResourceSchema } from "../uuid-resource";
import { TrackPlaylistRelWithoutPlaylistSchema } from "../uploaded-track-playlist-rel/without-playlist";
import { CriteriaMinimumSchema } from "../criteria/minimum";
import { CriteriaPlaylistMinimumSchema } from "./minimum";

export const CriteriaPlaylistDetailedSchema = UuidResourceSchema.extend({
  name: z.string(),
  trackPlaylistRelations: z.array(TrackPlaylistRelWithoutPlaylistSchema),
  tracksCount: z.number(),
  durationInSec: z.number(),
  durationStrInHourMinSec: z.string(),
  tracksArchivedCount: z.number(),
  criteria: CriteriaMinimumSchema,
  parent: CriteriaPlaylistMinimumSchema.nullable(),
  root: CriteriaPlaylistMinimumSchema,
  createdOn: z.string(),
  updatedOn: z.string(),
});

export type CriteriaPlaylistDetailed = z.infer<typeof CriteriaPlaylistDetailedSchema>;
