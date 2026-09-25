"use client";

import { useState } from "react";
import { Input } from "@behindthemusictree/ui";

import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";
import { searchGenrePlaylistsByName } from "./lib/genre-search";

export type GenreSearchProps = {
  genrePlaylists: CriteriaPlaylistSimple[];
  onSelect: (genrePlaylist: CriteriaPlaylistSimple) => void;
  placeholder?: string;
};

export default function GenreSearch({
  genrePlaylists,
  onSelect,
  placeholder = "Search a genre…",
}: GenreSearchProps) {
  const [query, setQuery] = useState("");
  const results = searchGenrePlaylistsByName(genrePlaylists, query);

  return (
    <div className="genre-search relative">
      <Input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        aria-label="Search a genre"
      />
      {results.length > 0 && (
        <ul className="genre-search-results absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-md">
          {results.map((genrePlaylist) => (
            <li key={genrePlaylist.uuid}>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                onClick={() => {
                  onSelect(genrePlaylist);
                  setQuery("");
                }}
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
