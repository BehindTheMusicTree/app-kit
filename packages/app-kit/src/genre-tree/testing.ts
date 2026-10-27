import type { GenrePlaylistUuid, GenreUuid } from "./schemas/ids";

// Test fixtures only: brands readable fixture ids ("jazz") without the UUID format check the schemas enforce.
export const makeGenreUuid = (value: string) => value as GenreUuid;
export const makeGenrePlaylistUuid = (value: string) => value as GenrePlaylistUuid;
