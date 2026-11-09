"use client";

import { ArrowLeft } from "lucide-react";
import { SEARCH_LEADING_BUTTON_CLASS } from "@behindthemusictree/ui";

import { CriteriaPlaylistSimple, useGenreSearch } from "@behindthemusictree/app-kit/genre-tree";
import { SearchBox, type SearchGroup } from "./search";

/** @deprecated Use `SearchGroup`. */
export type GenreSearchExtraGroup = SearchGroup;

export type GenreSearchProps<T extends CriteriaPlaylistSimple = CriteriaPlaylistSimple> = {
  genrePlaylists: T[];
  onSelect: (genrePlaylist: T) => void;
  /** Name of the currently selected genre; fills the input whenever it changes. */
  selectedName?: string | null;
  /** When set, renders a "Previous" button left of the text and makes room for it. */
  onPrevious?: () => void;
  /** Called by the clear button, after it empties the input. */
  onClear?: () => void;
  /** Forces the clear button on or off; by default it shows while the input has something to clear. */
  showClear?: boolean;
  clearLabel?: string;
  placeholder?: string;
  /** Called with what the user types, and with "" on clear or pick; never when `selectedName` refills the input. */
  onQueryChange?: (query: string) => void;
  /** Further result groups (places, artists, songs) the host resolves from `onQueryChange`. */
  extraGroups?: SearchGroup[];
  /** Called when the input gains focus. */
  onFocus?: () => void;
};

export default function GenreSearch<T extends CriteriaPlaylistSimple = CriteriaPlaylistSimple>({
  genrePlaylists,
  onSelect,
  selectedName = null,
  onClear,
  showClear,
  clearLabel,
  onPrevious,
  placeholder,
  onQueryChange,
  extraGroups = [],
  onFocus,
}: GenreSearchProps<T>) {
  const { query, setQuery, results, canClear, clear, select } = useGenreSearch({
    genrePlaylists,
    onSelect,
    selectedName,
    onClear,
  });

  const active = query !== "" && query !== selectedName;
  const hasExtras = extraGroups.length > 0;
  const label = hasExtras ? "Search" : "Search a genre";

  const groups: SearchGroup[] = [
    {
      key: "genres",
      label: hasExtras ? "Genres" : undefined,
      items: results.map((genrePlaylist) => ({
        key: genrePlaylist.uuid,
        content: (
          <>
            {genrePlaylist.name}
            {genrePlaylist.isUmbrella && (
              <span className="ml-2 text-xs italic text-[var(--color-text-muted)]">umbrella</span>
            )}
          </>
        ),
        onSelect: () => select(genrePlaylist),
      })),
    },
    ...extraGroups.map((group) =>
      active
        ? group
        : { ...group, items: [], status: "", loading: false },
    ),
  ];

  return (
    <div className="genre-search w-[calc(var(--layout-detail-panel-w,25.5rem)-2*var(--layout-panel-inset,1rem))] shrink-0 max-md:w-full">
      <SearchBox
        label={label}
        placeholder={placeholder}
        value={query}
        onValueChange={(value) => {
          setQuery(value);
          onQueryChange?.(value);
        }}
        groups={groups}
        onPicked={(groupKey) => {
          if (groupKey !== "genres") setQuery("");
          onQueryChange?.("");
        }}
        clearLabel={clearLabel}
        onClear={
          (showClear ?? canClear)
            ? () => {
                clear();
                onQueryChange?.("");
              }
            : undefined
        }
        leading={
          onPrevious && (
            <button type="button" aria-label="Previous" title="Previous" className={SEARCH_LEADING_BUTTON_CLASS} onClick={onPrevious}>
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </button>
          )
        }
        onFocus={onFocus}
      />
    </div>
  );
}
