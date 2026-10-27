"use client";

import { useState } from "react";
import { ChevronsLeft, ChevronsRight, ListMusic, X } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { usePlayer, PlayerVideoSurface } from "@behindthemusictree/app-kit/player";
import { useTrackListSidebarVisibility, type RenderArtistLink } from "@behindthemusictree/app-kit/genre-tree";
import TrackListSidebar from "./track-list-sidebar/TrackListSidebar";

export interface PlayerPanelProps {
  className?: string;
  /** Hidden via CSS, never unmounted, so the video keeps playing while the panel is closed. */
  isVisible?: boolean;
  onClose: () => void;
  /** Width once extended, e.g. to stop short of a left-hand detail panel. */
  extendedWidth?: string;
  renderArtistLink?: RenderArtistLink;
}

const iconButtonClassName = "flex h-6 w-6 shrink-0 items-center justify-center p-0 rounded-md hover:bg-white/10";

// 12px right gutter + 280px detail panel + 12px left gutter + 12px gap to this panel.
const DEFAULT_EXTENDED_WIDTH = "calc(100vw - 316px)";

export default function PlayerPanel({
  className,
  isVisible = true,
  onClose,
  extendedWidth = DEFAULT_EXTENDED_WIDTH,
  renderArtistLink,
}: PlayerPanelProps) {
  const { playerTrackObject } = usePlayer();
  const { toggleTrackListSidebar, isTrackListSidebarVisible } = useTrackListSidebarVisibility();
  const [isExtendRequested, setIsExtendRequested] = useState(false);
  const isExtended = isExtendRequested && isTrackListSidebarVisible;

  return (
    <div
      className={twMerge(
        "fixed right-3 top-[60px] z-40 flex max-h-[calc(100vh-116px)] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]",
        isExtended ? "flex-row" : "w-[280px] flex-col",
        isTrackListSidebarVisible && "h-[calc(100vh-116px)]",
        !isVisible && "hidden",
        className,
      )}
      style={isExtended ? { width: extendedWidth } : undefined}
    >
      <div className="flex w-[280px] shrink-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 p-2">
          {isTrackListSidebarVisible && (
            <button
              type="button"
              onClick={() => setIsExtendRequested((value) => !value)}
              className={iconButtonClassName}
              aria-label={isExtended ? "Shrink song list panel" : "Extend song list panel"}
            >
              {isExtended ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            </button>
          )}
          <span className="min-w-0 truncate text-sm font-semibold">{playerTrackObject?.track?.title}</span>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleTrackListSidebar}
              className={iconButtonClassName}
              aria-label={isTrackListSidebarVisible ? "Hide song list" : "Show song list"}
            >
              <ListMusic size={16} />
            </button>
            <button type="button" onClick={onClose} className={iconButtonClassName} aria-label="Close player">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="relative w-full shrink-0">
          <PlayerVideoSurface className="aspect-video w-full bg-black" />
          {playerTrackObject?.loadError && (
            <span className="absolute bottom-2 left-2 right-2 text-xs text-red-400">{playerTrackObject.loadError}</span>
          )}
        </div>
      </div>
      {isTrackListSidebarVisible && (
        <TrackListSidebar
          layout="inline"
          className={twMerge("min-h-0 min-w-0 flex-1", isExtended && "border-l border-zinc-800")}
          renderArtistLink={renderArtistLink}
        />
      )}
    </div>
  );
}
