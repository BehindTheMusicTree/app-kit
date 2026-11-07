import { z } from "zod";

import { GenrePlaylistUuidSchema, GenreUuidSchema } from "./ids";

export const GenreSearchTreeNameSchema = z.enum(["canonical", "regional"]);
export type GenreSearchTreeName = z.infer<typeof GenreSearchTreeNameSchema>;

export const GenreSearchResultSchema = z.object({
  /** Criteria (genre) uuid. */
  uuid: GenreUuidSchema,
  name: z.string(),
  /** Null for app-created genres, which the Wikidata-keyed region index does not reference. */
  wikidataId: z.string().nullable(),
  treeName: z.string(),
  /** Null when the genre has no playlist in the tree, so it cannot be opened there. */
  genrePlaylistUuid: GenrePlaylistUuidSchema.nullable(),
  root: z.object({ uuid: GenreUuidSchema, name: z.string() }),
  isUmbrella: z.boolean(),
  viewsCount: z.number().int(),
});

export const GenreSearchResultsSchema = z.array(GenreSearchResultSchema);

export type GenreSearchResult = z.infer<typeof GenreSearchResultSchema>;

export interface GenreSearchParams {
  q: string;
  limit?: number;
  treeName?: GenreSearchTreeName;
}

/** One entry of `regions/map/genres/`: a genre the region map index references, keyed by Wikidata id. */
export const RegionGenreLexiconEntrySchema = z.object({
  wikidataId: z.string(),
  uuid: GenreUuidSchema,
  name: z.string(),
  treeName: z.string(),
  genrePlaylistUuid: GenrePlaylistUuidSchema.nullable(),
  isUmbrella: z.boolean(),
  viewsCount: z.number().int(),
});

export const RegionGenreLexiconSchema = z.array(RegionGenreLexiconEntrySchema);

export type RegionGenreLexiconEntry = z.infer<typeof RegionGenreLexiconEntrySchema>;
