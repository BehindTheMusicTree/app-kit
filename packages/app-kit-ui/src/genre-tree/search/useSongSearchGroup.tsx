"use client";

import {
  isSongSearchResultPlayable,
  useSongSearch,
  type SongSearchResult,
} from "@behindthemusictree/app-kit/genre-tree";

import { searchStatus, type SearchGroup } from "./SearchGroup";

export function useSongSearchGroup(
  getBaseUrl: () => string,
  text: string,
  onSelect: (song: SongSearchResult) => void,
  enabled = true,
): SearchGroup | undefined {
  const search = useSongSearch(getBaseUrl, enabled ? text : "");
  if (!enabled) return undefined;
  return {
    key: "songs",
    label: "Songs",
    items: search.songs.map((song) => ({
      key: song.uuid,
      content: (
        <span className={isSongSearchResultPlayable(song) ? undefined : "opacity-60"}>
          <span className="block truncate font-medium">{song.title}</span>
          <span className="block truncate text-caption text-[var(--color-neutral-500)]">
            {[song.artists.map((artist) => artist.name).join(", "), song.genre?.name ?? "No genre"].filter(Boolean).join(" · ")}
          </span>
        </span>
      ),
      onSelect: () => onSelect(song),
    })),
    status: searchStatus(search, search.songs.length, "songs"),
    loading: search.pending,
  };
}
