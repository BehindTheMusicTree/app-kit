import { z } from "zod";

import { UuidResourceSchema } from "../uuid-resource";
import { makeTrackPlaylistRelSchema } from "../track-playlist-rel/without-playlist";
import { CriteriaMinimumSchema } from "../criteria/minimum";
import { CriteriaPlaylistMinimumSchema } from "./minimum";

// Fields shared by every criteria playlist shape, regardless of track kind. `trackPlaylistRelations`
// is deliberately excluded here — it's added by `makeCriteriaPlaylistDetailedSchema` below, since
// its track shape varies per consumer.
export const CriteriaPlaylistDetailedBaseSchema = UuidResourceSchema.extend({
  name: z.string(),
  tracksCount: z.number(),
  durationInSec: z.number(),
  durationStrInHourMinSec: z.string(),
  tracksArchivedCount: z.number(),
  // Nullable: the "Genreless" root playlist has no criteria attached and is never updated.
  criteria: CriteriaMinimumSchema.nullable(),
  parent: CriteriaPlaylistMinimumSchema.nullable(),
  root: CriteriaPlaylistMinimumSchema,
  createdOn: z.string(),
  updatedOn: z.string().nullable(),
});

export const makeCriteriaPlaylistDetailedSchema = <T extends z.ZodTypeAny>(trackSchema: T) =>
  CriteriaPlaylistDetailedBaseSchema.extend({
    trackPlaylistRelations: z.array(makeTrackPlaylistRelSchema(trackSchema)),
  });

export type CriteriaPlaylistDetailed<T extends z.ZodTypeAny> = z.infer<
  ReturnType<typeof makeCriteriaPlaylistDetailedSchema<T>>
>;
