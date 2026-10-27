"use client";

import { useState } from "react";
import { X } from "lucide-react";
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
  /** Hidden via CSS, never unmounted, so the video keeps playing while the panel is closed. */
  isVisible?: boolean;
  onClose: () => void;
  /** Controlled extended state; uncontrolled when omitted. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Width once extended, e.g. to stop short of a left-hand detail panel. */
  extendedWidth?: string;
  renderArtistLink?: RenderArtistLink;
}

const PANEL_ID = "player-panel";

const iconButtonClassName =
  "flex h-6 w-6 shrink-0 items-center justify-center p-0 rounded-md hover:bg-white/10";

// Spans the center and right columns.
const DEFAULT_EXTENDED_WIDTH =
  "calc(100vw - var(--layout-center-left) - var(--layout-gutter))";

export default function PlayerPanel({
  className,
  isVisible = true,
  onClose,
  expanded,
  onExpandedChange,
  extendedWidth = DEFAULT_EXTENDED_WIDTH,
  renderArtistLink,
}: PlayerPanelProps) {
  const { playerTrackObject } = usePlayer();
  const { toggleTrackListSidebar, isTrackListSidebarVisible } =
    useTrackListSidebarVisibility();
  const [uncontrolledExtended, setUncontrolledExtended] = useState(false);
  const isExtendRequested = expanded ?? uncontrolledExtended;
  const setIsExtendRequested = (next: boolean) => {
    setUncontrolledExtended(next);
    onExpandedChange?.(next);
  };
  const isExtended = isExtendRequested && isTrackListSidebarVisible;

  const tabEdge = !isTrackListSidebarVisible
    ? null
    : isExtended
      ? {
          label: "Shrink song list panel",
          onClick: () => setIsExtendRequested(false),
        }
      : { label: "Hide song list", onClick: toggleTrackListSidebar };
  const tabCenter = !isTrackListSidebarVisible
    ? { label: "Show song list", onClick: toggleTrackListSidebar }
    : isExtended
      ? null
      : {
          label: "Extend song list panel",
          onClick: () => setIsExtendRequested(true),
        };

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
              {playerTrackObject?.track?.title}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={onClose}
                className={iconButtonClassName}
                aria-label="Close player"
              >
                <X size={16} />
              </button>
            </div>
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
        {isTrackListSidebarVisible && (
          <TrackListSidebar
            layout="inline"
            className={twMerge(
              "min-h-0 min-w-0 flex-1",
              isExtended && "border-l border-zinc-800",
            )}
            renderArtistLink={renderArtistLink}
          />
        )}
      </div>
    </div>
  );
}
