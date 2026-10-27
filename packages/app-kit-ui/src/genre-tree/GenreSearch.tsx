"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { Input } from "@behindthemusictree/ui";

import { CriteriaPlaylistSimple, useGenreSearch } from "@behindthemusictree/app-kit/genre-tree";

export type GenreSearchExtraResults = {
  /** Heading of this group; genre matches then get a "Genres" heading above it. */
  label: string;
  items: { key: string; content: ReactNode; onSelect: () => void }[];
  /** Announced politely, e.g. "No artists found". */
  status?: string;
};

export type GenreSearchProps = {
  genrePlaylists: CriteriaPlaylistSimple[];
  onSelect: (genrePlaylist: CriteriaPlaylistSimple) => void;
  /** Name of the currently selected genre; fills the input whenever it changes. */
  selectedName?: string | null;
  /** When set, renders a "Previous" button left of the text; shown only when the host's CSS reveals `.genre-search-previous`. */
  onPrevious?: () => void;
  /** Called by the clear button, after it empties the input. */
  onClear?: () => void;
  placeholder?: string;
  /** Called with what the user types, and with "" on clear or pick; never when `selectedName` refills the input. */
  onQueryChange?: (query: string) => void;
  /** A second result group (e.g. artists) the host resolves from `onQueryChange`. */
  extraResults?: GenreSearchExtraResults;
};

export default function GenreSearch({
  genrePlaylists,
  onSelect,
  selectedName = null,
  onClear,
  onPrevious,
  placeholder,
  onQueryChange,
  extraResults,
}: GenreSearchProps) {
  const { query, setQuery, results, canClear, clear, select } = useGenreSearch({
    genrePlaylists,
    onSelect,
    selectedName,
    onClear,
  });

  const extraItems = query !== "" && query !== selectedName ? (extraResults?.items ?? []) : [];
  const label = extraResults ? "Search" : "Search a genre";
  const showList = results.length > 0 || extraItems.length > 0;
  const heading = "px-3 pt-2 pb-1 text-xs font-medium uppercase text-[var(--color-text-muted)]";

  return (
    <div className="genre-search relative w-[calc(var(--layout-detail-panel-w,25.5rem)-2*var(--layout-panel-inset,1rem))] shrink-0">
      {onPrevious && (
        <button
          type="button"
          aria-label="Previous"
          title="Previous"
          className="genre-search-previous absolute left-2 top-1/2 z-10 hidden p-1.5 text-[var(--color-text-muted)] rounded-full -translate-y-1/2 hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
          onClick={onPrevious}
        >
          <ArrowLeft aria-hidden="true" className="w-4 h-4" />
        </button>
      )}
      <Input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          onQueryChange?.(event.target.value);
        }}
        placeholder={placeholder ?? `${label}…`}
        aria-label={label}
        className="h-[var(--layout-search-h,3rem)] pl-6 pr-20 text-base transition-[padding] duration-200 ease-out motion-reduce:transition-none bg-[var(--color-surface)] border-[var(--color-border)] rounded-full shadow-md"
      />
      <div className="absolute right-3 top-1/2 flex items-center -translate-y-1/2">
          <span className="p-2 text-[var(--color-text-muted)] pointer-events-none">
            <Search aria-hidden="true" className="w-6 h-6" />
          </span>
          {canClear && (
            <button
              type="button"
              aria-label="Clear search"
              className="p-2 text-[var(--color-text-muted)] rounded-full hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
              onClick={() => {
                clear();
                onQueryChange?.("");
              }}
            >
              <X aria-hidden="true" className="w-6 h-6" />
            </button>
          )}
      </div>
      {extraResults?.status && (
        <p role="status" aria-live="polite" className="sr-only">
          {extraResults.status}
        </p>
      )}
      {showList && (
        <ul className="genre-search-results absolute z-40 w-full max-h-64 mt-1 overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-md">
          {extraResults && results.length > 0 && <li className={heading}>Genres</li>}
          {results.map((genrePlaylist) => (
            <li key={genrePlaylist.uuid}>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--color-surface-muted)]"
                onClick={() => {
                  select(genrePlaylist);
                  onQueryChange?.("");
                }}
              >
                {genrePlaylist.name}
                {genrePlaylist.isUmbrella && <span className="ml-2 text-xs italic text-[var(--color-text-muted)]">umbrella</span>}
              </button>
            </li>
          ))}
          {extraResults && extraItems.length > 0 && <li className={heading}>{extraResults.label}</li>}
          {extraItems.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--color-surface-muted)]"
                onClick={() => {
                  setQuery("");
                  onQueryChange?.("");
                  item.onSelect();
                }}
              >
                {item.content}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
