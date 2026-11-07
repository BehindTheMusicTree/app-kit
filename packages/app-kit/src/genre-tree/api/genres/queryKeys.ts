import type { GenreUuid } from "../../schemas/ids";
import type { GenreSearchParams } from "../../schemas/genre-search";

export const genreQueryKeys = {
  me: {
    all: ["genres"] as const,
    list: (page: number) => ["genres", "list", page] as const,
    detail: (id: GenreUuid) => ["genres", "detail", id] as const,
    byWikidataId: (qid: string) => ["genres", "byWikidataId", qid] as const,
    overview: (id: GenreUuid) => ["genres", "overview", id] as const,
  },
  reference: {
    all: ["referenceGenres"] as const,
    list: (page: number) => ["referenceGenres", "list", page] as const,
    detail: (id: GenreUuid) => ["referenceGenres", "detail", id] as const,
    byWikidataId: (qid: string) => ["referenceGenres", "byWikidataId", qid] as const,
    overview: (id: GenreUuid) => ["referenceGenres", "overview", id] as const,
  },
};

export const genreSearchQueryKeys = {
  search: (params: GenreSearchParams) => ["genreSearch", params] as const,
  regionLexicon: () => ["regionGenreLexicon"] as const,
};

export const genreUpdateMutationKey = ["genres", "update"] as const;
