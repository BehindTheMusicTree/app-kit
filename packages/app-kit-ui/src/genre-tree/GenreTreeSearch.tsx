"use client";

import { useDeferredValue, useState, type ComponentType, type ReactNode } from "react";
import type { GenreUuid } from "@behindthemusictree/app-kit/genre-tree";
import GenreSearch, { type GenreSearchProps } from "./GenreSearch";
import { useArtistSearchGroup, useSongSearchGroup, type SearchGroup } from "./search";

export interface GenreSearchGroupsProps {
  query: string;
  focused: boolean;
  onSelectGenre: (uuid: GenreUuid) => void;
  children: (groups: SearchGroup[]) => ReactNode;
}

type Props = GenreSearchProps & {
  artistBaseUrl: () => string;
  songBaseUrl: () => string;
  onArtistSelect: Parameters<typeof useArtistSearchGroup>[2];
  onSongSelect: Parameters<typeof useSongSearchGroup>[2];
  artistSearch: boolean;
  songSearch: boolean;
  SearchGroups?: ComponentType<GenreSearchGroupsProps>;
  onSelectGenre: (uuid: GenreUuid) => void;
};

/** Keep typed query updates and remote results inside the search subtree. */
export function GenreTreeSearch({
  artistBaseUrl, songBaseUrl, onArtistSelect, onSongSelect, artistSearch, songSearch,
  SearchGroups, onSelectGenre, extraGroups = [], onQueryChange, onFocus, ...props
}: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const artistGroup = useArtistSearchGroup(artistBaseUrl, deferredQuery, onArtistSelect, artistSearch);
  const songGroup = useSongSearchGroup(songBaseUrl, deferredQuery, onSongSelect, songSearch);
  const render = (hostGroups: SearchGroup[]) => (
    <GenreSearch
      {...props}
      onQueryChange={(text) => {
        setQuery(text);
        onQueryChange?.(text);
      }}
      onFocus={() => {
        setFocused(true);
        onFocus?.();
      }}
      extraGroups={[...extraGroups, ...hostGroups, artistGroup, songGroup].filter((group): group is SearchGroup => group !== undefined)}
    />
  );
  return SearchGroups
    ? <SearchGroups query={deferredQuery} focused={focused} onSelectGenre={onSelectGenre}>{render}</SearchGroups>
    : render([]);
}
