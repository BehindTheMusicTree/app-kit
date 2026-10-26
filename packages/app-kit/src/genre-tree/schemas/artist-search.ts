import { z } from "zod";

export const ArtistSearchResultSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  disambiguation: z.string().nullable(),
  type: z.enum(["person", "group", "orchestra", "choir", "character", "other"]).nullable(),
  country: z.string().nullable(),
  beginYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  matchedAlias: z.string().nullable(),
  recordingCount: z.number().int(),
});

export const ArtistSearchResultsSchema = z.array(ArtistSearchResultSchema);

export type ArtistSearchResult = z.infer<typeof ArtistSearchResultSchema>;
