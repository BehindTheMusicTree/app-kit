"use client";

import {
  useGenreRemoteSearch,
  type GenreSearchResult,
  type UseGenreRemoteSearchOptions,
} from "@behindthemusictree/app-kit/genre-tree";

import { searchStatus, type SearchGroup } from "./SearchGroup";

export type UseGenreRemoteSearchGroupOptions = UseGenreRemoteSearchOptions & {
  key?: string;
  label?: string;
  /** Drops hits the host already lists elsewhere. */
  filter?: (genre: GenreSearchResult) => boolean;
  /** Extra secondary text per hit, e.g. the region. */
  describe?: (genre: GenreSearchResult) => string | undefined;
};

/** Genres from the API's ranked `genres/search/`, rendered with the umbrella tag and the tree they live in. */
export function useGenreRemoteSearchGroup(
  getBaseUrl: () => string,
  text: string,
  onSelect: (genre: GenreSearchResult) => void,
  { key = "genres", label = "Genres", filter, describe, ...options }: UseGenreRemoteSearchGroupOptions = {},
): SearchGroup {
  const search = useGenreRemoteSearch(getBaseUrl, text, options);
  const genres = filter ? search.genres.filter(filter) : search.genres;
  return {
    key,
    label,
    items: genres.map((genre) => ({
      key: genre.uuid,
      content: (
        <>
          <span className="block truncate font-medium">
            {genre.name}
            {genre.isUmbrella && <span className="ml-2 text-xs font-normal italic text-[var(--color-text-muted)]">umbrella</span>}
          </span>
          <span className="block truncate text-xs text-[var(--color-neutral-500)]">
            {describe?.(genre) ?? `${genre.treeName} · ${genre.root.name}`}
          </span>
        </>
      ),
      onSelect: () => onSelect(genre),
    })),
    status: searchStatus(search, genres.length, "genres"),
    loading: search.pending,
  };
}
