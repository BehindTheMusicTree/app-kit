export const artistQueryKeys = {
  search: (query: string) => ["artistSearch", query] as const,
};
