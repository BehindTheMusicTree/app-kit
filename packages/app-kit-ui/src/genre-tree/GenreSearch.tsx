"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, LoaderCircle, Search, X } from "lucide-react";
import { Combobox } from "@behindthemusictree/ui";

import { CriteriaPlaylistSimple, useGenreSearch } from "@behindthemusictree/app-kit/genre-tree";

export type GenreSearchExtraGroup = {
  key: string;
  /** Heading of this group; genre matches then get a "Genres" heading too. */
  label: string;
  items: { key: string; content: ReactNode; onSelect: () => void }[];
  /** Announced politely, e.g. "No artists found". */
  status?: string;
  /** Shows a spinner in place of the search icon while the host resolves this group. */
  loading?: boolean;
};

export type GenreSearchProps<T extends CriteriaPlaylistSimple = CriteriaPlaylistSimple> = {
  genrePlaylists: T[];
  onSelect: (genrePlaylist: T) => void;
  /** Name of the currently selected genre; fills the input whenever it changes. */
  selectedName?: string | null;
  /** When set, renders a "Previous" button left of the text and makes room for it. */
  onPrevious?: () => void;
  /** Called by the clear button, after it empties the input. */
  onClear?: () => void;
  placeholder?: string;
  /** Called with what the user types, and with "" on clear or pick; never when `selectedName` refills the input. */
  onQueryChange?: (query: string) => void;
  /** Further result groups (artists, songs) the host resolves from `onQueryChange`. */
  extraGroups?: GenreSearchExtraGroup[];
};

export default function GenreSearch<T extends CriteriaPlaylistSimple = CriteriaPlaylistSimple>({
  genrePlaylists,
  onSelect,
  selectedName = null,
  onClear,
  onPrevious,
  placeholder,
  onQueryChange,
  extraGroups = [],
}: GenreSearchProps<T>) {
  const { query, setQuery, results, canClear, clear, select } = useGenreSearch({
    genrePlaylists,
    onSelect,
    selectedName,
    onClear,
  });
  const [open, setOpen] = useState(false);

  const active = query !== "" && query !== selectedName;
  const hasExtras = extraGroups.length > 0;
  const label = hasExtras ? "Search" : "Search a genre";
  const loading = active && extraGroups.some((group) => group.loading);
  const status = active ? extraGroups.map((group) => group.status).filter(Boolean).join(". ") : "";

  const groups = [
    {
      key: "genres",
      label: hasExtras ? "Genres" : undefined,
      options: results.map((genrePlaylist) => ({
        key: genrePlaylist.uuid,
        content: (
          <>
            {genrePlaylist.name}
            {genrePlaylist.isUmbrella && (
              <span className="ml-2 text-xs italic text-[var(--color-text-muted)]">umbrella</span>
            )}
          </>
        ),
      })),
    },
    ...extraGroups.map((group) => ({
      key: group.key,
      label: group.label,
      options: active ? group.items.map((item) => ({ key: item.key, content: item.content })) : [],
    })),
  ];

  const handlePick = (groupKey: string, optionKey: string) => {
    setOpen(false);
    if (groupKey === "genres") {
      const genrePlaylist = results.find((result) => result.uuid === optionKey);
      if (!genrePlaylist) return;
      select(genrePlaylist);
      onQueryChange?.("");
      return;
    }
    const item = extraGroups.find((group) => group.key === groupKey)?.items.find((entry) => entry.key === optionKey);
    if (!item) return;
    setQuery("");
    onQueryChange?.("");
    item.onSelect();
  };

  return (
    <div className="genre-search relative w-[calc(var(--layout-detail-panel-w,25.5rem)-2*var(--layout-panel-inset,1rem))] shrink-0 max-md:w-full">
      {onPrevious && (
        <button
          type="button"
          aria-label="Previous"
          title="Previous"
          className="genre-search-previous absolute left-2 top-1/2 z-10 flex items-center justify-center p-1.5 [@media(pointer:coarse)]:min-h-[var(--layout-touch-target)] [@media(pointer:coarse)]:min-w-[var(--layout-touch-target)] text-[var(--color-text-muted)] rounded-full -translate-y-1/2 hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
          onClick={onPrevious}
        >
          <ArrowLeft aria-hidden="true" className="w-4 h-4" />
        </button>
      )}
      <Combobox
        ariaLabel={label}
        listLabel={`${label} results`}
        value={query}
        placeholder={placeholder ?? `${label}…`}
        groups={groups}
        open={open}
        onOpenChange={setOpen}
        onValueChange={(value) => {
          setQuery(value);
          onQueryChange?.(value);
        }}
        onPick={handlePick}
        status={status}
        loading={loading ? "Searching…" : undefined}
        inputClassName={`h-[var(--layout-search-h,3rem)] ${onPrevious ? "pl-11" : "pl-6"} pr-20 text-base transition-[padding] duration-200 ease-out motion-reduce:transition-none bg-[var(--color-surface)] border-[var(--color-border)] rounded-full shadow-md focus-visible:ring-0`}
        className="genre-search-results z-40 rounded-xl shadow-md"
        listClassName="max-h-[min(20rem,50dvh)]"
        optionClassName="[@media(pointer:coarse)]:min-h-[var(--layout-touch-target)]"
      />
      <div className="absolute right-3 top-1/2 flex items-center -translate-y-1/2">
        <span data-loading={loading} className="relative p-2 text-[var(--color-text-muted)] pointer-events-none">
          <Search
            aria-hidden="true"
            className={`w-6 h-6 transition-opacity duration-200 motion-reduce:transition-none ${loading ? "opacity-0" : ""}`}
          />
          <LoaderCircle
            aria-hidden="true"
            className={`absolute inset-2 w-6 h-6 transition-opacity duration-200 motion-reduce:transition-none ${
              loading ? "opacity-100 delay-300 animate-spin motion-reduce:animate-none" : "opacity-0"
            }`}
          />
        </span>
        {canClear && (
          <button
            type="button"
            aria-label="Clear search"
            className="flex items-center justify-center p-2 [@media(pointer:coarse)]:min-h-[var(--layout-touch-target)] [@media(pointer:coarse)]:min-w-[var(--layout-touch-target)] text-[var(--color-text-muted)] rounded-full hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
            onClick={() => {
              clear();
              onQueryChange?.("");
            }}
          >
            <X aria-hidden="true" className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}
