import { z } from "zod";
import { UuidResourceSchema } from "../uuid-resource";

export const CriteriaMinimumSchema = UuidResourceSchema.extend({
  name: z.string(),
  side: z.enum(["core", "pop"]).nullable().optional(),
  wikidataId: z.string().nullable().optional(),
});

export type CriteriaMinimum = z.infer<typeof CriteriaMinimumSchema>;
