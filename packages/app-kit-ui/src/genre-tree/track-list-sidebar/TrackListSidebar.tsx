"use client";

import { ReactNode, useEffect, useRef } from "react";
import { ListMusic } from "lucide-react";

import TrackItem from "./TrackItem";
import { useTrackList } from "@behindthemusictree/app-kit/genre-tree";
import { TrackListOriginType } from "@behindthemusictree/app-kit/genre-tree";
import { TrackBase } from "@behindthemusictree/app-kit/genre-tree";
import { RenderArtistLink } from "@behindthemusictree/app-kit/genre-tree";
import { useTrackNoun } from "@behindthemusictree/app-kit/track-noun";

export interface TrackListSidebarProps<T extends TrackBase> {
  className?: string;
  renderDuration?: (track: T) => ReactNode;
  renderActions?: (track: T) => ReactNode;
  layout?: "fixed" | "inline";
  isCollapsed?: boolean;
  onExpand?: () => void;
  onMinimize?: () => void;
  /** When set, artist names render through it (e.g. a router `Link`). */
  renderArtistLink?: RenderArtistLink;
}

export default function TrackListSidebar<T extends TrackBase>({
  className = "",
  renderDuration,
  renderActions,
  layout = "fixed",
  isCollapsed = false,
  onExpand,
  onMinimize,
  renderArtistLink,
}: TrackListSidebarProps<T>) {
  const { trackList, loadMore, autoAdvancedTrackUuid } = useTrackList<T>();
  const trackNoun = useTrackNoun();
  const trackListRef = useRef<HTMLUListElement>(null);
  const previousOriginRef = useRef(trackList?.origin ?? null);
  const handledAutoAdvanceRef = useRef<string | null>(null);
  const shouldFollowPlaybackRef = useRef(true);
  const programmaticScrollTopRef = useRef<number | null>(null);
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

  useEffect(() => {
    const origin = trackList?.origin ?? null;
    if (previousOriginRef.current === origin) return;
    previousOriginRef.current = origin;
    handledAutoAdvanceRef.current = null;
    shouldFollowPlaybackRef.current = true;
    programmaticScrollTopRef.current = null;
    if (trackListRef.current) trackListRef.current.scrollTop = 0;
  }, [trackList?.origin]);

  useEffect(() => {
    const list = trackListRef.current;
    if (!isCollapsed && list?.scrollTop === 0) shouldFollowPlaybackRef.current = true;
  }, [isCollapsed]);

  useEffect(() => {
    if (!autoAdvancedTrackUuid || handledAutoAdvanceRef.current === autoAdvancedTrackUuid) return;
    if (isCollapsed) return;

    const list = trackListRef.current;
    if (!list) return;
    handledAutoAdvanceRef.current = autoAdvancedTrackUuid;
    if (!shouldFollowPlaybackRef.current) return;

    const row = Array.from(list.querySelectorAll<HTMLElement>("[data-track-uuid]")).find(
      (element) => element.dataset.trackUuid === autoAdvancedTrackUuid,
    );
    if (!row) return;

    const rowTop = row.getBoundingClientRect().top - list.getBoundingClientRect().top;
    list.scrollTop += rowTop;
    programmaticScrollTopRef.current = list.scrollTop;
  }, [autoAdvancedTrackUuid, isCollapsed]);

  const handleTrackListScroll = (event: React.UIEvent<HTMLUListElement>) => {
    const list = event.currentTarget;
    const programmaticScrollTop = programmaticScrollTopRef.current;
    if (programmaticScrollTop !== null && Math.abs(list.scrollTop - programmaticScrollTop) <= 1) {
      programmaticScrollTopRef.current = null;
      return;
    }
    programmaticScrollTopRef.current = null;
    shouldFollowPlaybackRef.current = list.scrollTop <= 1;
  };
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
      <div className="header flex h-16 items-center px-4 py-2 text-[var(--color-text)]">
        <div className="min-w-0 flex flex-1 flex-col justify-center">
          <div className="origin flex text-xl">
            <div className="from h-auto flex flex-col justify-center items-center mr-2">From</div>
            <div className="name-container flex flex-col justify-center items-center text-[var(--color-text)] font-bold pr-2 max-w-[27.5rem]">
              <div className="name max-w-full truncate">{trackList.origin.label}</div>
            </div>
          </div>
          <div className="info flex items-center text-sm text-[var(--color-text-muted)]">
            {trackList.origin.type === TrackListOriginType.GENRE_PLAYLIST
              ? "Genre • "
              : trackList.origin.type === TrackListOriginType.ARTIST
                ? "Artist • "
                : `${trackNoun.singular} playlist • `}
            {`${trackList.total} ${trackList.total > 1 ? trackNoun.plural : trackNoun.singular}`}
          </div>
        </div>
        {((isCollapsed && onExpand) || (!isCollapsed && onMinimize)) && (
          <button
            type="button"
            aria-label={isCollapsed ? "Show tracks" : "Hide tracks"}
            title={isCollapsed ? "Show tracks" : "Hide tracks"}
            aria-expanded={!isCollapsed}
            className={`ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-[var(--color-surface-muted)] ${isCollapsed ? "text-[var(--color-text-muted)]" : "text-white"}`}
            onClick={isCollapsed ? onExpand : onMinimize}
          >
            <ListMusic aria-hidden="true" className="h-5 w-5" />
          </button>
        )}
      </div>
      {!isCollapsed && (
        <ul
          ref={trackListRef}
          onScroll={handleTrackListScroll}
          className={
            layout === "inline"
              ? "track-list flex-1 min-h-0 overflow-auto list-none p-0 m-0"
              : "track-list overflow-auto max-h-[calc(100vh-63.5px-79px-56px-3.5px)] list-none p-0 m-0"
          }
        >
          {trackList.tracks.map((track, index) => (
            <li key={track.uuid} data-track-uuid={track.uuid}>
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
      )}
    </div>
  ) : null;
}
