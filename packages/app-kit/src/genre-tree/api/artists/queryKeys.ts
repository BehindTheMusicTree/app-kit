export const artistQueryKeys = {
  search: (query: string) => ["artistSearch", query] as const,
  detail: (uuid: string | null) => ["artist", uuid] as const,
  // baseUrl keeps distinct backends sharing a scope apart.
  genreCounts: (baseUrl: string, uuid: string | null) => ["artistGenreCounts", baseUrl, uuid] as const,
};
