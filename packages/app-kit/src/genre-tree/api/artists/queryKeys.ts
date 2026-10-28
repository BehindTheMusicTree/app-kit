export const artistQueryKeys = {
  search: (query: string) => ["artistSearch", query] as const,
  detail: (uuid: string | null) => ["artist", uuid] as const,
};
