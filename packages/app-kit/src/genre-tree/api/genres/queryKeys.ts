import type { GenreUuid } from "../../schemas/ids";

export const genreQueryKeys = {
  me: {
    all: ["genres"] as const,
    list: (page: number) => ["genres", "list", page] as const,
    detail: (id: GenreUuid) => ["genres", "detail", id] as const,
    overview: (id: GenreUuid) => ["genres", "overview", id] as const,
  },
  reference: {
    all: ["referenceGenres"] as const,
    list: (page: number) => ["referenceGenres", "list", page] as const,
    detail: (id: GenreUuid) => ["referenceGenres", "detail", id] as const,
    overview: (id: GenreUuid) => ["referenceGenres", "overview", id] as const,
  },
};
