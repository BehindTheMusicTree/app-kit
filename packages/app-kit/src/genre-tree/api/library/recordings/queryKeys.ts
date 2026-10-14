export const makeRecordingQueryKeys = (prefix: string) => ({
  all: [`${prefix}Recordings`] as const,
  list: (page: number) => [`${prefix}Recordings`, "list", page] as const,
  detail: (uuid: string) => [`${prefix}Recordings`, "detail", uuid] as const,
  // baseUrl keeps distinct backends sharing a scope (e.g. grow and its prototype proxy) apart.
  byGenre: (baseUrl: string, genreUuid: string) => [`${prefix}Recordings`, baseUrl, "genre", genreUuid] as const,
});
