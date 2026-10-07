"use client";

import { ReactNode } from "react";

import { usePlayer } from "../../player/PlayerContext";
import { useTrackList } from "../TrackListContext";
import TrackPositionPlayPause from "../TrackPositionPlayPause";
import { TrackBase } from "../schemas/track/base";
import { unplayableReasonLabel } from "../schemas/youtube-track/detailed";
import { MusicBrainzRecordingLink } from "../MusicBrainzRecordingLink";

export interface TrackItemProps<T extends TrackBase> {
  track: T;
  position: number;
  renderDuration?: (track: T) => ReactNode;
  renderActions?: (track: T) => ReactNode;
}

export default function TrackItem<T extends TrackBase>({
  track,
  position,
  renderDuration,
  renderActions,
}: TrackItemProps<T>) {
  const { handlePlayPauseAction, playerTrackObject, loadTrackForPlayer } = usePlayer();
  const { trackList, toTrackAtPosition } = useTrackList<T>();
  const scope = trackList?.origin?.scope ?? null;
  const unplayableReason = unplayableReasonLabel(track);

  const handlePlayPauseClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (playerTrackObject && playerTrackObject.track.id === track.uuid) {
      handlePlayPauseAction();
    } else if (scope != null) {
      toTrackAtPosition(position);
      loadTrackForPlayer(track.uuid);
    }
  };

  return (
    <div
      className={`track-item flex h-14 text-gray-400 ${unplayableReason ? "opacity-50" : "hover:bg-gray-900 group"}`}
      title={unplayableReason ?? undefined}
    >
      {unplayableReason ? (
        <div
          className="flex items-center justify-center text-lg w-16"
          style={{ minWidth: "64px", maxWidth: "64px" }}
          aria-disabled="true"
        >
          {position}
        </div>
      ) : (
        <TrackPositionPlayPause position={position} uuid={track.uuid} handlePlayPauseClick={handlePlayPauseClick} />
      )}
      <div className="title-artist-container flex flex-col items-start justify-center w-1/2">
        <div className="flex max-w-full items-center gap-2">
          <div className="title text-lg font-bold text-gray-300 text-overflow">{track.title}</div>
          <MusicBrainzRecordingLink track={track} title={track.title} />
        </div>
        {track.artists && track.artists.length > 0 ? (
          <div className="artist text-base text-overflow">{track.artists.map((artist) => artist.name).join(", ")}</div>
        ) : (
          ""
        )}
        {unplayableReason && <div className="text-xs">{unplayableReason}</div>}
      </div>
      <div className="album-name items-start justify-center w-1/3 ml-2 text-overflow ">
        {track.album ? track.album.name : ""}
      </div>
      <div className="genre-name-container flex items-center justify-end w-1/6">
        {track.genre ? (
          <div className="genre-name font-bold p-1 border border-gray-400 text-xs text-overflow">{track.genre.name}</div>
        ) : (
          ""
        )}
      </div>
      <div
        className="duration flex text-base w-16 items-center justify-center"
        style={{ minWidth: "64px", maxWidth: "64px" }}
      >
        {renderDuration?.(track) ?? ""}
      </div>
      {renderActions && (
        <div className="edit flex text-base w-6 items-center justify-center mr-2 cursor-pointer">
          {renderActions(track)}
        </div>
      )}
    </div>
  );
}
