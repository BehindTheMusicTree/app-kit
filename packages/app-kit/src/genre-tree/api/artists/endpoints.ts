export const artistEndpoints = {
  search: () => "artists/search/",
  detail: (uuid: string) => `artists/${uuid}/`,
};
