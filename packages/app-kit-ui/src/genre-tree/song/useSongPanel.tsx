"use client";

import { Skeleton } from "@behindthemusictree/ui";
import {
  useSong,
  type CriteriaMinimum,
  type CriteriaPlaylistSimple,
  type RenderArtistLink,
} from "@behindthemusictree/app-kit/genre-tree";
import type { Scope } from "@behindthemusictree/app-kit/transport";
import type { GetGenreTreeShareUrl } from "../share";
import SongPanelContent from "./SongPanelContent";
import type { OverlayPanel } from "../overlayPanel";

/** How the song's genre is opened: through the loaded tree's playlists, or by the genre alone for a host without a tree. */
export type SongGenreNavigation =
  | {
      /** Root-to-leaf playlists of a genre in the loaded tree; empty when the tree doesn't hold it. */
      getGenrePath: (genre: CriteriaMinimum) => CriteriaPlaylistSimple[];
      onSelectGenrePlaylist: (genrePlaylist: CriteriaPlaylistSimple) => void;
      onSelectGenre?: never;
    }
  | {
      onSelectGenre: (genre: CriteriaMinimum) => void;
      getGenrePath?: never;
      onSelectGenrePlaylist?: never;
    };

export type SongPanelOptions = {
  uuid: string | null;
  scope: Scope;
  getBackendBaseUrl: () => string;
  getShareUrl?: GetGenreTreeShareUrl;
  renderArtistLink: RenderArtistLink;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onClose: () => void;
} & SongGenreNavigation;

/** The song detail overlay panel for `uuid`, or undefined when no song is set. */
export function useSongPanel({
  uuid,
  scope,
  getBackendBaseUrl,
  getShareUrl,
  renderArtistLink,
  expanded,
  onExpandedChange,
  onClose,
  ...navigation
}: SongPanelOptions): OverlayPanel | undefined {
  const result = useSong(uuid, getBackendBaseUrl);

  const panel = { expanded, onExpandedChange, onClose };
  switch (result.status) {
    case "idle":
      return undefined;
    case "loading":
      return {
        ...panel,
        title: "Song",
        content: (
          <div aria-busy="true" className="flex flex-col gap-2.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ),
      };
    case "not-found":
      return {
        ...panel,
        title: "Song not found",
        content: <p className="text-[var(--color-text-muted)]">This song does not exist.</p>,
      };
    case "error":
      return {
        ...panel,
        title: "Song",
        content: <p className="text-red-600">Could not load this song.</p>,
      };
    case "success": {
      const { song } = result;
      const shareUrl = getShareUrl?.({ kind: "song", uuid: song.uuid, name: song.title, scope });
      return {
        ...panel,
        title: song.title,
        content: (
          <SongPanelContent
            song={song}
            scope={scope}
            getBackendBaseUrl={getBackendBaseUrl}
            shareUrl={shareUrl ?? undefined}
            renderArtistLink={renderArtistLink}
            {...(navigation.getGenrePath
              ? {
                  genrePath: song.genre ? navigation.getGenrePath(song.genre) : [],
                  onSelectGenrePlaylist: navigation.onSelectGenrePlaylist,
                }
              : { onSelectGenre: navigation.onSelectGenre })}
          />
        ),
      };
    }
  }
}
