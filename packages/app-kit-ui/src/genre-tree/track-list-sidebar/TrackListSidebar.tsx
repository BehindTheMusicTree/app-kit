"use client";

import { ReactNode, useEffect, useRef } from "react";

import TrackItem from "./TrackItem";
import { useTrackList } from "@behindthemusictree/app-kit/genre-tree";
import { useTrackListSidebarVisibility } from "@behindthemusictree/app-kit/genre-tree";
import { TrackListOriginType } from "@behindthemusictree/app-kit/genre-tree";
import { TrackBase } from "@behindthemusictree/app-kit/genre-tree";
import { RenderArtistLink } from "@behindthemusictree/app-kit/genre-tree";
import { useTrackNoun } from "@behindthemusictree/app-kit/track-noun";

export interface TrackListSidebarProps<T extends TrackBase> {
  className?: string;
  renderDuration?: (track: T) => ReactNode;
  renderActions?: (track: T) => ReactNode;
  layout?: "fixed" | "inline";
  /** When set, artist names render through it (e.g. a router `Link`). */
  renderArtistLink?: RenderArtistLink;
}

export default function TrackListSidebar<T extends TrackBase>({
  className = "",
  renderDuration,
  renderActions,
  layout = "fixed",
  renderArtistLink,
}: TrackListSidebarProps<T>) {
  const { trackList, loadMore } = useTrackList<T>();
  const trackNoun = useTrackNoun();
  const loadMoreSentinelRef = useRef<HTMLLIElement>(null);
  const hasMore = !!trackList && trackList.nextPage !== null;

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!hasMore || !sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMore().catch((error) => console.error("Failed to load more tracks:", error));
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);
  const { hideTrackListSidebar } = useTrackListSidebarVisibility();

  const positionClasses =
    layout === "inline"
      ? "relative w-full flex h-full flex-col"
      : "fixed right-0 w-[50rem]";

  return trackList ? (
    <div
      data-theme="dark"
      className={`track-list-sidebar ${positionClasses} rounded-2xl bg-[var(--color-surface)] pb-1 ${className}`}
      style={layout === "fixed" ? { bottom: "79px" /* Match player height exactly */ } : undefined}
    >
      <div className="header flex h-16 px-4 py-2 text-[var(--color-text)]">
        <div className="origin flex text-xl ">
          <div className="from h-auto flex flex-col justify-center items-center mr-2">From</div>
          <div className="name-container flex flex-col justify-center items-center text-[var(--color-text)] font-bold pr-2 max-w-[27.5rem]">
            <div className="name max-w-full truncate">{trackList.origin.label}</div>
          </div>
        </div>
        <div className="info flex flex-col justify-center items-center pt-1 mr-2 text-[var(--color-text-muted)]">
          {trackList.origin.type === TrackListOriginType.GENRE_PLAYLIST
            ? "• Genre playlist • "
            : trackList.origin.type === TrackListOriginType.ARTIST
              ? "• Artist • "
              : `• ${trackNoun.singular} playlist • `}
          {`${trackList.total} ${trackList.total > 1 ? trackNoun.plural : trackNoun.singular} •`}
        </div>
        <button
          type="button"
          aria-label="Close track list"
          className="flex-grow flex flex-col items-end justify-center h-full p-3 cursor-pointer text-inherit"
          onClick={hideTrackListSidebar}
        >
          &#10005;
        </button>
      </div>
      <ul
        className={
          layout === "inline"
            ? "track-list flex-1 min-h-0 overflow-auto list-none p-0 m-0"
            : "track-list overflow-auto max-h-[calc(100vh-63.5px-79px-56px-3.5px)] list-none p-0 m-0"
        }
      >
        {trackList.tracks.map((track, index) => (
          <li key={track.uuid}>
            <TrackItem
              track={track}
              position={index + 1}
              renderDuration={renderDuration}
              renderActions={renderActions}
              renderArtistLink={renderArtistLink}
            />
          </li>
        ))}
        {hasMore && <li ref={loadMoreSentinelRef} aria-hidden="true" className="h-px" />}
      </ul>
    </div>
  ) : null;
}
