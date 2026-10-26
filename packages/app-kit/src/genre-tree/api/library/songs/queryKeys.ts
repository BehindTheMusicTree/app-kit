export const makeSongQueryKeys = (prefix: string) => ({
  all: [`${prefix}Songs`] as const,
  list: (page: number) => [`${prefix}Songs`, "list", page] as const,
  detail: (uuid: string) => [`${prefix}Songs`, "detail", uuid] as const,
  // baseUrl keeps distinct backends sharing a scope (e.g. grow and its prototype proxy) apart.
  byGenre: (baseUrl: string, genreUuid: string) => [`${prefix}Songs`, baseUrl, "genre", genreUuid] as const,
});
