import { GenrePlaylistUuidSchema, GenreUuidSchema, type GenrePlaylistUuid, type GenreUuid } from "./schemas/ids";

// Test fixtures only. A readable name ("jazz") maps to a stable UUID, so the same name yields the same id across runs.
// Genre and playlist names are salted apart so the two id spaces never collide.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fnv1a(input: string, offsetBasis: number): number {
  let hash = offsetBasis;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function nameToUuid(salt: string, name: string): string {
  const hex = [0x811c9dc5, 0x01000193, 0x5bd1e995, 0x27d4eb2f]
    .map((offsetBasis) => fnv1a(`${salt}:${name}`, offsetBasis).toString(16).padStart(8, "0"))
    .join("");
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export const makeGenreUuid = (value: string): GenreUuid =>
  GenreUuidSchema.parse(UUID_PATTERN.test(value) ? value : nameToUuid("genre", value));

export const makeGenrePlaylistUuid = (value: string): GenrePlaylistUuid =>
  GenrePlaylistUuidSchema.parse(UUID_PATTERN.test(value) ? value : nameToUuid("genre-playlist", value));
