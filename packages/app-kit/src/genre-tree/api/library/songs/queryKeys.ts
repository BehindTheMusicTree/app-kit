import { genreMusicSelectionKey, type GenreMusicSelection } from "../../../lib/genre-music-selection";
import type { GenreUuid } from "../../../schemas/ids";

export const makeSongQueryKeys = (prefix: string) => ({
  all: [`${prefix}Songs`] as const,
  list: (page: number) => [`${prefix}Songs`, "list", page] as const,
  detail: (uuid: string | null) => [`${prefix}Songs`, "detail", uuid] as const,
  history: (uuid: string | null) => [`${prefix}Songs`, "history", uuid] as const,
  search: (params: { q: string; limit?: number; genre?: string; playable?: boolean }) =>
    [`${prefix}Songs`, "search", params] as const,
  // baseUrl keeps distinct backends sharing a scope (e.g. grow and its prototype proxy) apart.
  byGenre: (baseUrl: string, genreUuid: GenreUuid, selection?: GenreMusicSelection) => [`${prefix}Songs`, baseUrl, "genre", genreUuid, ...genreMusicSelectionKey(selection)] as const,
});
