import { z } from "zod";

// A genre (criteria) and its genre playlist are 1:1 but live in distinct UUID spaces: `genres/{uuid}/`
// takes the former, `genre-playlists/{uuid}/` the latter. Branding makes mixing them a compile error.
export const GenreUuidSchema = z.string().uuid().brand<"GenreUuid">();
export const GenrePlaylistUuidSchema = z.string().uuid().brand<"GenrePlaylistUuid">();

export type GenreUuid = z.infer<typeof GenreUuidSchema>;
export type GenrePlaylistUuid = z.infer<typeof GenrePlaylistUuidSchema>;
