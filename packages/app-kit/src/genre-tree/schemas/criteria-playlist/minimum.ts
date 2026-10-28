import { z } from "zod";

import { GenrePlaylistUuidSchema } from "../ids";

export const CriteriaPlaylistMinimumSchema = z.object({
  uuid: GenrePlaylistUuidSchema,
  name: z.string(),
});

export type CriteriaPlaylistMinimum = z.infer<typeof CriteriaPlaylistMinimumSchema>;
