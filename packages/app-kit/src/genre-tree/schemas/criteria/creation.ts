import { z } from "zod";

import { GenreUuidSchema } from "../ids";

export const CriteriaCreationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  parent: GenreUuidSchema.optional(),
  essentialSongs: z.array(z.string().uuid()).optional(),
});

export type CriteriaCreationValues = z.infer<typeof CriteriaCreationSchema>;
