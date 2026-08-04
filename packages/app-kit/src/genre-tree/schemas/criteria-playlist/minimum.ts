import { z } from "zod";

import { UuidResourceSchema } from "../uuid-resource";

export const CriteriaPlaylistMinimumSchema = UuidResourceSchema.extend({
  name: z.string(),
});

export type CriteriaPlaylistMinimum = z.infer<typeof CriteriaPlaylistMinimumSchema>;
