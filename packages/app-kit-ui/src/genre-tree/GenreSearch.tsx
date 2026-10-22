"use client";

import { Pause, Play, Search, X, ZoomIn } from "lucide-react";
import { Input } from "@behindthemusictree/ui";

import { CriteriaPlaylistSimple, useGenreSearch } from "@behindthemusictree/app-kit/genre-tree";

export type GenreSearchProps = {
  genrePlaylists: CriteriaPlaylistSimple[];
  onSelect: (genrePlaylist: CriteriaPlaylistSimple) => void;
  /** Name of the currently selected genre; fills the input whenever it changes. */
  selectedName?: string | null;
  /** Called by the clear button, after it empties the input. */
  onClear?: () => void;
  /** When set, shows a "Zoom in" button that fires it. */
  onZoomIn?: () => void;
  /** When set, shows a Play/Pause button at the right end of the field that fires it. */
  onPlayPause?: () => void;
  isPlaying?: boolean;
  placeholder?: string;
};

export default function GenreSearch({
  genrePlaylists,
  onSelect,
  selectedName = null,
  onClear,
  onZoomIn,
  onPlayPause,
  isPlaying = false,
  placeholder = "Search a genre…",
}: GenreSearchProps) {
  const { query, setQuery, results, canClear, clear, select } = useGenreSearch({
    genrePlaylists,
    onSelect,
    selectedName,
    onClear,
  });

  return (
    <div className="genre-search relative w-[264px] shrink-0">
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
        className={`pl-9 ${onPlayPause ? (onZoomIn ? "pr-24" : "pr-16") : onZoomIn ? "pr-16" : "pr-9"} bg-white border-[var(--color-neutral-200)] rounded-full shadow-md`}
      />
      {(onZoomIn || onPlayPause || canClear) && (
        <div className="absolute right-2 top-1/2 flex items-center -translate-y-1/2">
          {onZoomIn && (
            <button
              type="button"
              aria-label="Zoom in"
              title="Zoom in"
              className="p-1 text-[var(--color-neutral-500)] bg-transparent rounded-full hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-text)]"
              onClick={onZoomIn}
            >
              <ZoomIn aria-hidden="true" className="w-4 h-4" />
            </button>
          )}
          {canClear && (
            <button
              type="button"
              aria-label="Clear search"
              className="p-1 text-[var(--color-neutral-500)] bg-transparent rounded-full hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-text)]"
              onClick={clear}
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          )}
          {onPlayPause && (
            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
              className="p-1 text-[var(--color-neutral-500)] bg-transparent rounded-full hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-text)]"
              onClick={onPlayPause}
            >
              {isPlaying ? (
                <Pause aria-hidden="true" className="w-4 h-4" />
              ) : (
                <Play aria-hidden="true" className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
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
                {genrePlaylist.isUmbrella && <span className="ml-2 text-xs italic text-[var(--color-neutral-500)]">umbrella</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
