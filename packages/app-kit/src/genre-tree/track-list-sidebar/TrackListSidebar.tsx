"use client";

import { ReactNode } from "react";

import TrackItem from "./TrackItem";
import { useTrackList } from "../TrackListContext";
import { useTrackListSidebarVisibility } from "../TrackListSidebarVisibilityContext";
import { TrackListOriginType } from "../models/TrackListOriginType";
import { TrackBase } from "../schemas/track/base";

export interface TrackListSidebarProps<T extends TrackBase> {
  className?: string;
  renderDuration?: (track: T) => ReactNode;
  renderActions?: (track: T) => ReactNode;
}

export default function TrackListSidebar<T extends TrackBase>({
  className,
  renderDuration,
  renderActions,
}: TrackListSidebarProps<T>) {
  const { trackList } = useTrackList<T>();
  const { hideTrackListSidebar } = useTrackListSidebarVisibility();

  return trackList ? (
    <div
      className={`track-list-sidebar fixed right-0 w-144 rounded-2xl bg-gray-950 pb-1 ${className}`}
      style={{
        bottom: "79px", // Match player height exactly
      }}
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
          {trackList.tracks.length + " track" + (trackList.tracks.length > 1 ? "s •" : " •")}
        </div>
        <div
          className="flex-grow flex flex-col items-end justify-center h-full cursor-pointer"
          onClick={hideTrackListSidebar}
        >
          &#10005;
        </div>
      </div>
      {/* Use viewport height minus banner, player, header and padding */}
      <ul className={"track-list overflow-auto max-h-[calc(100vh-63.5px-79px-56px-3.5px)] list-none p-0 m-0"}>
        {trackList.tracks.map((track, index) => (
          <li key={track.uuid}>
            <TrackItem track={track} position={index + 1} renderDuration={renderDuration} renderActions={renderActions} />
          </li>
        ))}
      </ul>
    </div>
  ) : null;
}
