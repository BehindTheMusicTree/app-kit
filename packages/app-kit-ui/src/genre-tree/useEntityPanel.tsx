"use client";

import type { RenderArtistLink, RenderPlaceLink, RenderSongLink } from "@behindthemusictree/app-kit/genre-tree";
import type { Scope } from "@behindthemusictree/app-kit/transport";
import { useArtistPanel } from "./artist/useArtistPanel";
import { useSongPanel, type SongGenreNavigation } from "./song/useSongPanel";
import type { GetGenreTreeShareUrl } from "./share";
import type { OverlayPanel } from "./overlayPanel";

export interface EntityPanelState {
  uuid: string | null;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onClose: () => void;
}

export type EntityPanelOptions = {
  scope: Scope;
  getBackendBaseUrl: () => string;
  /** Artist requests go here when the host serves them from elsewhere; defaults to `getBackendBaseUrl`. */
  getArtistBackendBaseUrl?: () => string;
  getShareUrl?: GetGenreTreeShareUrl;
  renderArtistLink: RenderArtistLink;
  renderSongLink: RenderSongLink;
  renderPlaceLink?: RenderPlaceLink;
  song: EntityPanelState;
  artist: EntityPanelState;
} & SongGenreNavigation;

/** The song or artist detail overlay panel; a song takes precedence over an artist, undefined when neither is set. */
export function useEntityPanel({
  scope,
  getBackendBaseUrl,
  getArtistBackendBaseUrl,
  getShareUrl,
  renderArtistLink,
  renderSongLink,
  renderPlaceLink,
  song,
  artist,
  ...navigation
}: EntityPanelOptions): OverlayPanel | undefined {
  const songPanel = useSongPanel({
    ...song,
    scope,
    getBackendBaseUrl,
    getShareUrl,
    renderArtistLink,
    ...navigation,
  } as Parameters<typeof useSongPanel>[0]);
  const artistPanel = useArtistPanel({
    ...artist,
    scope,
    getBackendBaseUrl: getArtistBackendBaseUrl ?? getBackendBaseUrl,
    getShareUrl,
    renderArtistLink,
    renderSongLink,
    renderPlaceLink,
  });
  return songPanel ?? artistPanel;
}
