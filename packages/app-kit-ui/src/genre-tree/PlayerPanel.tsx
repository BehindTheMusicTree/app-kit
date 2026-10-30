"use client";

import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import {
  usePlayer,
  PlayerVideoSurface,
} from "@behindthemusictree/app-kit/player";
import {
  useTrackListSidebarVisibility,
  type RenderArtistLink,
} from "@behindthemusictree/app-kit/genre-tree";
import PanelEdgeTab from "./PanelEdgeTab";
import TrackListSidebar from "./track-list-sidebar/TrackListSidebar";

export interface PlayerPanelProps {
  className?: string;
  /** Hidden via CSS, never unmounted, so the video keeps playing while the host hides the panel. */
  isVisible?: boolean;
  /** @deprecated The player no longer closes; its header action minimizes to video-only mode. */
  onClose?: () => void;
  /** Controlled extended state; uncontrolled when omitted. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Width once extended, e.g. to stop short of a left-hand detail panel. */
  extendedWidth?: string;
  renderArtistLink?: RenderArtistLink;
}

const PANEL_ID = "player-panel";

// Spans the center and right columns.
const DEFAULT_EXTENDED_WIDTH =
  "calc(100vw - var(--layout-center-left) - var(--layout-gutter))";

export default function PlayerPanel({
  className,
  isVisible = true,
  expanded,
  onExpandedChange,
  extendedWidth = DEFAULT_EXTENDED_WIDTH,
  renderArtistLink,
}: PlayerPanelProps) {
  const { playerTrackObject } = usePlayer();
  const { toggleTrackListSidebar, isTrackListSidebarVisible } =
    useTrackListSidebarVisibility();
  const [lastLoadedTrackTitle, setLastLoadedTrackTitle] = useState("");
  const loadedTrackTitle = playerTrackObject?.track.title;
  useEffect(() => {
    if (loadedTrackTitle) setLastLoadedTrackTitle(loadedTrackTitle);
  }, [loadedTrackTitle]);
  const [uncontrolledExtended, setUncontrolledExtended] = useState(false);
  const isExtendRequested = expanded ?? uncontrolledExtended;
  const setIsExtendRequested = (next: boolean) => {
    setUncontrolledExtended(next);
    onExpandedChange?.(next);
  };
  const isExtended = isExtendRequested && isTrackListSidebarVisible;
  const hideSongList = () => {
    setIsExtendRequested(false);
    if (isTrackListSidebarVisible) toggleTrackListSidebar();
  };

  const tabEdge =
    isTrackListSidebarVisible && isExtended
      ? {
          label: "Shrink player panel",
          onClick: () => setIsExtendRequested(false),
          expanded: true,
        }
      : null;
  const tabCenter =
    isTrackListSidebarVisible && !isExtended
      ? {
          label: "Extend player panel",
          onClick: () => setIsExtendRequested(true),
          expanded: false,
        }
      : null;

  return (
    <div
      id={PANEL_ID}
      className={twMerge(
        "fixed right-[var(--layout-gutter)] top-[var(--layout-band-top)] z-40 max-h-[calc(100vh-var(--layout-band-top)-3.5rem)]",
        !isExtended && "w-[var(--layout-right-w)]",
        isTrackListSidebarVisible &&
          "h-[calc(100vh-var(--layout-band-top)-3.5rem)]",
        !isVisible && "hidden",
        className,
      )}
      style={isExtended ? { width: extendedWidth } : undefined}
    >
      <PanelEdgeTab
        side="right"
        edge={tabEdge}
        center={tabCenter}
        controls={PANEL_ID}
        className="absolute right-full top-1/2 -translate-y-1/2"
      />
      <div
        className={twMerge(
          "flex h-full max-h-[inherit] overflow-hidden rounded-[var(--radius-panel,1rem)] bg-zinc-950 text-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.5),0_2px_6px_2px_rgba(0,0,0,0.3)]",
          isExtended ? "flex-row" : "flex-col",
        )}
      >
        <div className="flex w-[var(--layout-right-w)] shrink-0 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 p-2">
            <span className="min-w-0 truncate text-sm font-semibold">
              {loadedTrackTitle || lastLoadedTrackTitle}
            </span>
          </div>
          <div className="relative w-full shrink-0">
            <PlayerVideoSurface className="aspect-video w-full bg-black" />
            {playerTrackObject?.loadError && (
              <span className="absolute bottom-2 left-2 right-2 text-xs text-red-400">
                {playerTrackObject.loadError}
              </span>
            )}
          </div>
        </div>
        <TrackListSidebar
          layout="inline"
          isCollapsed={!isTrackListSidebarVisible}
          onExpand={toggleTrackListSidebar}
          onMinimize={hideSongList}
          className={twMerge(
            "min-h-0 min-w-0 flex-1",
            isExtended && "border-l border-zinc-800",
          )}
          renderArtistLink={renderArtistLink}
        />
      </div>
    </div>
  );
}
