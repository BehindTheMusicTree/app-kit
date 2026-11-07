"use client";

import { useArtistSearch, type ArtistSearchResult } from "@behindthemusictree/app-kit/genre-tree";

import { searchStatus, type SearchGroup } from "./SearchGroup";

export function useArtistSearchGroup(
  getBaseUrl: () => string,
  text: string,
  onSelect: (artist: ArtistSearchResult) => void,
  enabled = true,
): SearchGroup | undefined {
  const search = useArtistSearch(getBaseUrl, enabled ? text : "");
  if (!enabled) return undefined;
  return {
    key: "artists",
    label: "Artists",
    items: search.artists.map((artist) => ({
      key: artist.uuid,
      content: (
        <>
          <span className="block truncate font-medium">
            {artist.name}
            {artist.disambiguation && (
              <span className="font-normal text-[var(--color-neutral-500)]"> · {artist.disambiguation}</span>
            )}
          </span>
          {artist.matchedAlias && (
            <span className="block truncate text-xs text-[var(--color-neutral-500)]">also known as {artist.matchedAlias}</span>
          )}
        </>
      ),
      onSelect: () => onSelect(artist),
    })),
    status: searchStatus(search, search.artists.length, "artists"),
    loading: search.pending,
  };
}
