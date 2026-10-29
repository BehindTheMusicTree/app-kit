import { z } from "zod";

import { HttpUrlSchema } from "./http-url";

export const MbArtistDetailedSchema = z.object({
  musicbrainzId: z.string().uuid(),
  name: z.string(),
  musicbrainzLink: HttpUrlSchema,
});

export type MusicbrainzArtistDetailed = z.infer<typeof MbArtistDetailedSchema>;
