import type { GenreUuid } from "../../schemas/ids";

const makeGenreEndpoints = (prefix: string) => ({
  list: () => `${prefix}genres/`,
  detail: (id: GenreUuid) => `${prefix}genres/${id}/`,
  overview: (id: GenreUuid) => `${prefix}genres/${id}/overview/`,
  create: () => `${prefix}genres/`,
  update: (id: GenreUuid) => `${prefix}genres/${id}/`,
  delete: (id: GenreUuid) => `${prefix}genres/${id}/`,
});

export const genreEndpoints = {
  me: makeGenreEndpoints("me/"),
  reference: makeGenreEndpoints(""),
};
