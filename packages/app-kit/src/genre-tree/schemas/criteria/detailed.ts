import { z } from "zod";

import { UuidResourceSchema } from "../uuid-resource";
import { CriteriaMinimumSchema } from "./minimum";
import { CriteriaPlaylistMinimumSchema } from "../criteria-playlist/minimum";
import { TrackMinimumSchema } from "../track/minimum";
import { CriteriaLineageRelWithoutAscendantSchema } from "./lineage-rel/without-ascendant";
import { CriteriaLineageRelWithoutDescendantSchema } from "./lineage-rel/without-descendant";

export const CriteriaDetailedSchema = UuidResourceSchema.extend({
  name: z.string(),
  parent: CriteriaMinimumSchema.nullable(),
  ascendants: z.array(CriteriaLineageRelWithoutDescendantSchema),
  descendants: z.array(CriteriaLineageRelWithoutAscendantSchema),
  root: CriteriaMinimumSchema,
  children: z.array(CriteriaMinimumSchema),
  criteriaPlaylist: CriteriaPlaylistMinimumSchema,
  tracks: z.array(TrackMinimumSchema),
  tracksCount: z.number(),
  tracksArchivedCount: z.number(),
  updatedOn: z.string().datetime().nullable(),
});

export type CriteriaDetailed = z.infer<typeof CriteriaDetailedSchema>;
