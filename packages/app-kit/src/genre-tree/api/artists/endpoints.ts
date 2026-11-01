export const artistEndpoints = {
  search: () => "artists/search/",
  detail: (uuid: string) => `artists/${uuid}/`,
  genreCounts: (uuid: string) => `artists/${uuid}/genre-counts/`,
};
