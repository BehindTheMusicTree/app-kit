import { z } from "zod";

import { GenreUuidSchema } from "../ids";
import { CriteriaMinimumSchema } from "./minimum";

export const CriteriaSimpleSchema = z.object({
  uuid: GenreUuidSchema,
  name: z.string(),
  parent: CriteriaMinimumSchema.nullable(),
  createdOn: z.string().datetime(),
  summary: z.string().nullable(),
});

export type CriteriaSimple = z.infer<typeof CriteriaSimpleSchema>;
