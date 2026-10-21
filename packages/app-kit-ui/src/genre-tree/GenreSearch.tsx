"use client";

import { Search, X } from "lucide-react";
import { Input } from "@behindthemusictree/ui";

import { CriteriaPlaylistSimple, useGenreSearch } from "@behindthemusictree/app-kit/genre-tree";

export type GenreSearchProps = {
  genrePlaylists: CriteriaPlaylistSimple[];
  onSelect: (genrePlaylist: CriteriaPlaylistSimple) => void;
  /** Name of the currently selected genre; fills the input whenever it changes. */
  selectedName?: string | null;
  /** Called by the clear button, after it empties the input. */
  onClear?: () => void;
  placeholder?: string;
};

export default function GenreSearch({
  genrePlaylists,
  onSelect,
  selectedName = null,
  onClear,
  placeholder = "Search a genre…",
}: GenreSearchProps) {
  const { query, setQuery, results, canClear, clear, select } = useGenreSearch({
    genrePlaylists,
    onSelect,
    selectedName,
    onClear,
  });

  return (
    <div className="genre-search relative w-[280px] shrink-0">
      <Search
        aria-hidden="true"
        className="absolute left-3 top-1/2 w-4 h-4 text-[var(--color-neutral-500)] -translate-y-1/2 pointer-events-none"
      />
      <Input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        aria-label="Search a genre"
        className="pl-9 pr-9 bg-white border-[var(--color-neutral-200)] rounded-full shadow-md"
      />
      {canClear && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-2 top-1/2 p-1 text-[var(--color-neutral-500)] bg-transparent rounded-full -translate-y-1/2 hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-text)]"
          onClick={clear}
        >
          <X aria-hidden="true" className="w-4 h-4" />
        </button>
      )}
      {results.length > 0 && (
        <ul className="genre-search-results absolute z-40 w-full max-h-64 mt-1 overflow-y-auto bg-white border border-[var(--color-neutral-200)] rounded-xl shadow-md">
          {results.map((genrePlaylist) => (
            <li key={genrePlaylist.uuid}>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left bg-transparent rounded-none hover:bg-[var(--color-neutral-100)]"
                onClick={() => select(genrePlaylist)}
              >
                {genrePlaylist.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
