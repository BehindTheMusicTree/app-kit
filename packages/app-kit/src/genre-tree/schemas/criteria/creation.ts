import { z } from "zod";

export const CriteriaCreationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  parent: z.string().optional(),
  essentialTracks: z.array(z.string().uuid()).optional(),
});

export type CriteriaCreationValues = z.infer<typeof CriteriaCreationSchema>;
