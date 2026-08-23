import { z } from "zod";
import { CriteriaPlaylistDetailedBaseSchema } from "./detailed";

export const CriteriaPlaylistSimpleSchema = CriteriaPlaylistDetailedBaseSchema.pick({
  uuid: true,
  name: true,
  criteria: true,
  parent: true,
  root: true,
  tracksCount: true,
  createdOn: true,
  updatedOn: true,
});

export type CriteriaPlaylistSimple = z.infer<typeof CriteriaPlaylistSimpleSchema>;
