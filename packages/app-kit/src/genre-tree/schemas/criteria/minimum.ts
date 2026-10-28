import { z } from "zod";
import { GenreUuidSchema } from "../ids";

export const CriteriaMinimumSchema = z.object({
  uuid: GenreUuidSchema,
  name: z.string(),
  side: z.enum(["core", "pop"]).nullable().optional(),
  wikidataId: z.string().nullable().optional(),
});

export type CriteriaMinimum = z.infer<typeof CriteriaMinimumSchema>;
