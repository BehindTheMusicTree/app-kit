import { z } from "zod";

import { ArtistMinimumSchema } from "./artist-minimum";

export const AlbumMinimumSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  albumArtists: z.array(ArtistMinimumSchema).nullable().optional(),
});

export type AlbumMinimum = z.infer<typeof AlbumMinimumSchema>;
