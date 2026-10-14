import { z } from "zod";

export const ArtistMinimumSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  isSpecialPurpose: z.boolean(),
});

export type ArtistMinimum = z.infer<typeof ArtistMinimumSchema>;
