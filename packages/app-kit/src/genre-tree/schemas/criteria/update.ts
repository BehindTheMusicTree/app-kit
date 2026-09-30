import { z } from "zod";

export const CriteriaUpdateSchema = z.object({
  name: z.string().optional(),
  parent: z.string().nullable().optional(),
  essentialTracks: z.array(z.string().uuid()).optional(),
});

export type CriteriaUpdateValues = z.infer<typeof CriteriaUpdateSchema>;
