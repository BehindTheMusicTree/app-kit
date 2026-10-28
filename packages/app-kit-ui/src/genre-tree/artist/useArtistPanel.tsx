"use client";

import { Skeleton } from "@behindthemusictree/ui";
import type { GenreTreeOverlayPanel } from "@behindthemusictree/genre-tree-view";
import { useArtist, type RenderArtistLink } from "@behindthemusictree/app-kit/genre-tree";
import ArtistHeader from "./ArtistHeader";
import ArtistPhoto from "./ArtistPhoto";
import ArtistMembers from "./ArtistMembers";
import ArtistDiscography from "./ArtistDiscography";
import ArtistSongs from "./ArtistSongs";

export interface ArtistPanelOptions {
  uuid: string | null;
  getBackendBaseUrl: () => string;
  /** Renders member and song artist names. */
  renderArtistLink: RenderArtistLink;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onClose: () => void;
}

/** The artist detail overlay panel for `uuid`, or undefined when no artist is set. */
export function useArtistPanel({
  uuid,
  getBackendBaseUrl,
  renderArtistLink,
  expanded,
  onExpandedChange,
  onClose,
}: ArtistPanelOptions): GenreTreeOverlayPanel | undefined {
  const result = useArtist(uuid, getBackendBaseUrl);

  const panel = { expanded, onExpandedChange, onClose };
  switch (result.status) {
    case "idle":
      return undefined;
    case "loading":
      return {
        ...panel,
        title: "Artist",
        content: (
          <div aria-busy="true" className="flex flex-col gap-2.5 px-6 py-2.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 mt-2.5" />
            <Skeleton className="h-16" />
          </div>
        ),
      };
    case "not-found":
      return {
        ...panel,
        title: "Artist not found",
        content: <p className="px-6 py-2.5 text-[var(--color-text-muted)]">This artist does not exist.</p>,
      };
    case "error":
      return {
        ...panel,
        title: "Artist",
        content: <p className="px-6 py-2.5 text-red-600">Could not load this artist.</p>,
      };
    case "success": {
      const { artist } = result;
      return {
        ...panel,
        title: artist.name,
        content: (
          <>
            {artist.image && <ArtistPhoto image={artist.image} name={artist.name} />}
            <ArtistHeader artist={artist} />
            <ArtistMembers title="Members" memberships={artist.members} renderArtistLink={renderArtistLink} />
            <ArtistMembers title="Member of" memberships={artist.memberOf} renderArtistLink={renderArtistLink} />
            {artist.tracksCount > 0 && (
              <ArtistSongs
                artist={{ uuid: artist.uuid, name: artist.name }}
                getBackendBaseUrl={getBackendBaseUrl}
                renderArtistLink={renderArtistLink}
              />
            )}
          </>
        ),
        extraContent: artist.albums.length > 0 ? <ArtistDiscography albums={artist.albums} /> : undefined,
      };
    }
  }
}
