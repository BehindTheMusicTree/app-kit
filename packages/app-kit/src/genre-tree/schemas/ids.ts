import { z } from "zod";

// A genre (criteria) and its genre playlist are 1:1 but live in distinct UUID spaces: `genres/{uuid}/`
// takes the former, `genre-playlists/{uuid}/` the latter. Branding makes mixing them a compile error.
export const GenreUuidSchema = z.string().uuid().brand<"GenreUuid">();
export const GenrePlaylistUuidSchema = z.string().uuid().brand<"GenrePlaylistUuid">();

export const ArtistUuidSchema = z.string().uuid().brand<"ArtistUuid">();
export const SongUuidSchema = z.string().uuid().brand<"SongUuid">();

export type GenreUuid = z.infer<typeof GenreUuidSchema>;
export type GenrePlaylistUuid = z.infer<typeof GenrePlaylistUuidSchema>;
export type ArtistUuid = z.infer<typeof ArtistUuidSchema>;
export type SongUuid = z.infer<typeof SongUuidSchema>;

function toId<S extends z.ZodType<string>>(schema: S) {
  return (value: string | null): z.infer<S> | null => {
    const parsed = schema.safeParse(value);
    return parsed.success ? parsed.data : null;
  };
}

/** The id as a `GenreUuid`, or null when it is absent or malformed (e.g. a raw URL value). */
export const toGenreUuid = toId(GenreUuidSchema);

/** The id as an `ArtistUuid`, or null when it is absent or malformed (e.g. a raw URL value). */
export const toArtistUuid = toId(ArtistUuidSchema);

/** The id as a `SongUuid`, or null when it is absent or malformed (e.g. a raw URL value). */
export const toSongUuid = toId(SongUuidSchema);
