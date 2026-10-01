"use client";

import { ReactNode, useEffect, useRef } from "react";

import TrackItem from "./TrackItem";
import { useTrackList } from "../TrackListContext";
import { useTrackListSidebarVisibility } from "../TrackListSidebarVisibilityContext";
import { TrackListOriginType } from "../models/TrackListOriginType";
import { TrackBase } from "../schemas/track/base";

export interface TrackListSidebarProps<T extends TrackBase> {
  className?: string;
  renderDuration?: (track: T) => ReactNode;
  renderActions?: (track: T) => ReactNode;
  layout?: "fixed" | "inline";
}

export default function TrackListSidebar<T extends TrackBase>({
  className = "",
  renderDuration,
  renderActions,
  layout = "fixed",
}: TrackListSidebarProps<T>) {
  const { trackList, loadMore } = useTrackList<T>();
  const loadMoreSentinelRef = useRef<HTMLLIElement>(null);
  const hasMore = !!trackList && trackList.nextPage !== null;

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!hasMore || !sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMore().catch((error) => console.error("Failed to load more genre playlist tracks:", error));
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);
  const { hideTrackListSidebar } = useTrackListSidebarVisibility();

  const positionClasses =
    layout === "inline"
      ? "relative w-full flex h-full flex-col"
      : "fixed right-0 w-144 flex flex-col";

  return trackList ? (
    <div
      className={`track-list-sidebar ${positionClasses} rounded-2xl bg-gray-950 pb-1 ${className}`}
      style={
        layout === "fixed"
          ? { top: "63.5px", maxHeight: "calc(100vh - 63.5px - 79px)" } // Below app header, above player
          : undefined
      }
    >
      <div className="header flex h-16 px-4 py-2 text-gray-400">
        <div className="origin flex text-xl ">
          <div className="from h-auto flex flex-col justify-center items-center mr-2">From</div>
          <div className="name-container flex flex-col justify-center items-center text-gray-300 font-bold pr-2 max-w-trackListName">
            <div className="name text-overflow">{trackList.origin.label}</div>
          </div>
        </div>
        <div className="info flex flex-col justify-center items-center text-m pt-1 mr-2">
          {trackList && trackList.origin.type === TrackListOriginType.GENRE_PLAYLIST
            ? "• Genre playlist • "
            : "• track playlist • "}
          {trackList.total + " track" + (trackList.total > 1 ? "s •" : " •")}
        </div>
        <div
          className="flex-grow flex flex-col items-end justify-center h-full cursor-pointer"
          onClick={hideTrackListSidebar}
        >
          &#10005;
        </div>
      </div>
      <ul className="track-list flex-1 min-h-0 overflow-auto list-none p-0 m-0">
        {trackList.tracks.map((track, index) => (
          <li key={track.uuid}>
            <TrackItem track={track} position={index + 1} renderDuration={renderDuration} renderActions={renderActions} />
          </li>
        ))}
        {hasMore && <li ref={loadMoreSentinelRef} aria-hidden="true" className="h-px" />}
      </ul>
    </div>
  ) : null;
}
