"use client";

import { Skeleton } from "@behindthemusictree/ui";
import type { GenreTreeOverlayPanel } from "@behindthemusictree/genre-tree-view";
import {
  useSong,
  type CriteriaMinimum,
  type CriteriaPlaylistSimple,
  type RenderArtistLink,
} from "@behindthemusictree/app-kit/genre-tree";
import type { Scope } from "@behindthemusictree/app-kit/transport";
import type { GetGenreTreeShareUrl } from "../share";
import SongPanelContent from "./SongPanelContent";

export interface SongPanelOptions {
  uuid: string | null;
  scope: Scope;
  getBackendBaseUrl: () => string;
  getShareUrl?: GetGenreTreeShareUrl;
  renderArtistLink: RenderArtistLink;
  /** Root-to-leaf playlists of a genre in the loaded tree; empty when the tree doesn't hold it. */
  getGenrePath: (genre: CriteriaMinimum) => CriteriaPlaylistSimple[];
  onSelectGenre: (genrePlaylist: CriteriaPlaylistSimple) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onClose: () => void;
}

/** The song detail overlay panel for `uuid`, or undefined when no song is set. */
export function useSongPanel({
  uuid,
  scope,
  getBackendBaseUrl,
  getShareUrl,
  renderArtistLink,
  getGenrePath,
  onSelectGenre,
  expanded,
  onExpandedChange,
  onClose,
}: SongPanelOptions): GenreTreeOverlayPanel | undefined {
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
          <div aria-busy="true" className="flex flex-col gap-2.5 px-6 py-2.5">
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
        content: <p className="px-6 py-2.5 text-[var(--color-text-muted)]">This song does not exist.</p>,
      };
    case "error":
      return {
        ...panel,
        title: "Song",
        content: <p className="px-6 py-2.5 text-red-600">Could not load this song.</p>,
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
            genrePath={song.genre ? getGenrePath(song.genre) : []}
            onSelectGenre={onSelectGenre}
          />
        ),
      };
    }
  }
}
