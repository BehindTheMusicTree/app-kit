import { z } from "zod";
import { CriteriaPlaylistDetailedSchema } from "./detailed";

export const CriteriaPlaylistSimpleSchema = CriteriaPlaylistDetailedSchema.pick({
  uuid: true,
  name: true,
  criteria: true,
  parent: true,
  root: true,
  tracksCount: true,
  createdOn: true,
  updatedOn: true,
}).extend({
  // Only on the tree/list payloads, not the detail endpoint — hence not on the detailed schema.
  isUnacceptedRoot: z.boolean(),
});

export type CriteriaPlaylistSimple = z.infer<typeof CriteriaPlaylistSimpleSchema>;
