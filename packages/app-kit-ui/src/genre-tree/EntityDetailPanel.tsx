"use client";

import { useState, type ComponentProps } from "react";
import { DetailPanel } from "@behindthemusictree/ui";
import type { RenderArtistLink, RenderPlaceLink, RenderSongLink } from "@behindthemusictree/app-kit/genre-tree";
import type { Scope } from "@behindthemusictree/app-kit/transport";
import { useEntityPanel } from "./useEntityPanel";
import type { SongGenreNavigation } from "./song/useSongPanel";
import type { GetGenreTreeShareUrl } from "./share";

export type EntityDetailPanelProps = {
  scope: Scope;
  getBackendBaseUrl: () => string;
  getArtistBackendBaseUrl?: () => string;
  getShareUrl?: GetGenreTreeShareUrl;
  songUuid: string | null;
  onSongUuidChange: (uuid: string | null) => void;
  artistUuid: string | null;
  onArtistUuidChange: (uuid: string | null) => void;
  /** Names render as buttons that open the artist by default. */
  renderArtistLink?: RenderArtistLink;
  /** Titles render as buttons that open the song by default. */
  renderSongLink?: RenderSongLink;
  renderPlaceLink?: RenderPlaceLink;
  collapsed?: boolean;
  edgeTab?: ComponentProps<typeof DetailPanel>["edgeTab"];
} & SongGenreNavigation;

/** The song or artist detail in the shared left DetailPanel, for a host that has no genre tree. Renders nothing
 * while neither is set; a song takes precedence over an artist. */
export function EntityDetailPanel({
  scope,
  getBackendBaseUrl,
  getArtistBackendBaseUrl,
  getShareUrl,
  songUuid,
  onSongUuidChange,
  artistUuid,
  onArtistUuidChange,
  renderArtistLink,
  renderSongLink,
  renderPlaceLink,
  collapsed,
  edgeTab,
  ...navigation
}: EntityDetailPanelProps) {
  // Keyed by uuid, so switching entities (including a host's back/forward) starts compact.
  const [expandedSongUuid, setExpandedSongUuid] = useState<string | null>(null);
  const [expandedArtistUuid, setExpandedArtistUuid] = useState<string | null>(null);

  const panel = useEntityPanel({
    scope,
    getBackendBaseUrl,
    getArtistBackendBaseUrl,
    getShareUrl,
    renderPlaceLink,
    renderArtistLink:
      renderArtistLink ??
      ((artist) =>
        artist.isSpecialPurpose ? (
          artist.name
        ) : (
          <button type="button" onClick={() => onArtistUuidChange(artist.uuid)} className="hover:underline">
            {artist.name}
          </button>
        )),
    renderSongLink:
      renderSongLink ??
      ((song) => (
        <button type="button" onClick={() => onSongUuidChange(song.uuid)} className="hover:underline">
          {song.title}
        </button>
      )),
    song: {
      uuid: songUuid,
      expanded: songUuid !== null && expandedSongUuid === songUuid,
      onExpandedChange: (on) => setExpandedSongUuid(on ? songUuid : null),
      onClose: () => onSongUuidChange(null),
    },
    artist: {
      uuid: artistUuid,
      expanded: artistUuid !== null && expandedArtistUuid === artistUuid,
      onExpandedChange: (on) => setExpandedArtistUuid(on ? artistUuid : null),
      onClose: () => onArtistUuidChange(null),
    },
    ...navigation,
  } as Parameters<typeof useEntityPanel>[0]);
  if (!panel) return null;

  return (
    <DetailPanel
      side="left"
      title={panel.title}
      cover={panel.cover}
      titleInSearch
      onClose={panel.onClose}
      collapsed={collapsed}
      expanded={panel.expanded}
      onExpandedChange={panel.onExpandedChange}
      aside={panel.extraContent}
      edgeTab={edgeTab}
    >
      {panel.extraContent && !panel.expanded ? (
        <>
          {panel.content}
          {panel.extraContent}
        </>
      ) : (
        panel.content
      )}
    </DetailPanel>
  );
}
