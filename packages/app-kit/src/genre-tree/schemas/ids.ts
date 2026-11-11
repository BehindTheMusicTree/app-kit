import { z } from "zod";

// A genre (criteria) and its genre playlist are 1:1 but live in distinct UUID spaces: `genres/{uuid}/`
// takes the former, `genre-playlists/{uuid}/` the latter. Branding makes mixing them a compile error.
export const GenreUuidSchema = z.string().uuid().brand<"GenreUuid">();
export const GenrePlaylistUuidSchema = z.string().uuid().brand<"GenrePlaylistUuid">();

export type GenreUuid = z.infer<typeof GenreUuidSchema>;
export type GenrePlaylistUuid = z.infer<typeof GenrePlaylistUuidSchema>;

/** The id as a `GenreUuid`, or null when it is absent or malformed (e.g. a raw URL value). */
export function toGenreUuid(value: string | null): GenreUuid | null {
  const parsed = GenreUuidSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
