import { z } from "zod";
import { CriteriaPlaylistDetailedSchema } from "./detailed";

export const CriteriaPlaylistSimpleSchema = CriteriaPlaylistDetailedSchema.pick({
  uuid: true,
  name: true,
  criteria: true,
  parent: true,
  root: true,
  tracksCount: true,
  viewsCount: true,
  createdOn: true,
  updatedOn: true,
}).extend({
  // Only on the tree/list payloads, not the detail endpoint — hence not on the detailed schema.
  isUnacceptedRoot: z.boolean(),
  // Optional: a backend that does not curate umbrella genres omits it.
  isUmbrella: z.boolean().optional(),
  // Optional: only the grow tree payload carries it; null when the genre has no scene.
  scene: z.enum(["commercial", "underground"]).nullable().optional(),
});

export type CriteriaPlaylistSimple = z.infer<typeof CriteriaPlaylistSimpleSchema>;
