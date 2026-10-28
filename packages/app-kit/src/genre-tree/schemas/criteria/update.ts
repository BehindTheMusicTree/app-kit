import { z } from "zod";

import { GenreUuidSchema } from "../ids";

export const CriteriaUpdateSchema = z.object({
  name: z.string().optional(),
  parent: GenreUuidSchema.nullable().optional(),
  essentialSongs: z.array(z.string().uuid()).optional(),
});

export type CriteriaUpdateValues = z.infer<typeof CriteriaUpdateSchema>;
