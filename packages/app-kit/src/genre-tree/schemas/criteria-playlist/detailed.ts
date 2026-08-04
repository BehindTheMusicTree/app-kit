import { z } from "zod";

import { UuidResourceSchema } from "../uuid-resource";
import { UploadedTrackPlaylistRelWithoutPlaylistSchema } from "../uploaded-track-playlist-rel/without-playlist";
import { CriteriaMinimumSchema } from "../criteria/minimum";
import { CriteriaPlaylistMinimumSchema } from "./minimum";

export const CriteriaPlaylistDetailedSchema = UuidResourceSchema.extend({
  name: z.string(),
  uploadedTrackPlaylistRelations: z.array(UploadedTrackPlaylistRelWithoutPlaylistSchema),
  uploadedTracksCount: z.number(),
  durationInSec: z.number(),
  durationStrInHourMinSec: z.string(),
  uploadedTracksArchivedCount: z.number(),
  criteria: CriteriaMinimumSchema,
  parent: CriteriaPlaylistMinimumSchema.nullable(),
  root: CriteriaPlaylistMinimumSchema,
  createdOn: z.string(),
  updatedOn: z.string(),
});

export type CriteriaPlaylistDetailed = z.infer<typeof CriteriaPlaylistDetailedSchema>;
