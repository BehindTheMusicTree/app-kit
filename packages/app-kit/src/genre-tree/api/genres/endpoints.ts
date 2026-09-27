const makeGenreEndpoints = (prefix: string) => ({
  list: () => `${prefix}genres/`,
  detail: (id: string) => `${prefix}genres/${id}/`,
  overview: (id: string) => `${prefix}genres/${id}/overview/`,
  create: () => `${prefix}genres/`,
  update: (id: string) => `${prefix}genres/${id}/`,
  delete: (id: string) => `${prefix}genres/${id}/`,
});

export const genreEndpoints = {
  me: makeGenreEndpoints("me/"),
  reference: makeGenreEndpoints(""),
};
