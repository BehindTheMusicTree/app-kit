"use client";

import { FaPlay, FaPause } from "react-icons/fa";

import { usePlayer } from "@behindthemusictree/app-kit/player";
import { PlayStates } from "@behindthemusictree/app-kit/player";

export interface TrackPositionPlayPauseProps {
  position: number;
  uuid: string;
  handlePlayPauseClick: (event: React.MouseEvent) => void;
  isSelected?: boolean;
}

export default function TrackPositionPlayPause({
  position,
  uuid,
  handlePlayPauseClick,
  isSelected = false,
}: TrackPositionPlayPauseProps) {
  const { playerTrackObject, playbackConfirmedTrackId, playState, isLoading: isPlayerLoading } = usePlayer();
  const isThisTrack = playerTrackObject?.track.id === uuid;
  const isConfirmedPlayable = playbackConfirmedTrackId === uuid;
  const isAwaitingPlayback =
    (isSelected || isThisTrack) &&
    !isConfirmedPlayable &&
    !(isThisTrack && playerTrackObject?.loadError) &&
    (!isThisTrack || isPlayerLoading || playState === PlayStates.LOADING || playState === PlayStates.PLAYING);
  const isPlaying = isThisTrack && isConfirmedPlayable && playState === PlayStates.PLAYING;
  const isPaused = isThisTrack && isConfirmedPlayable && playState === PlayStates.PAUSED;
  const isCurrentTrackActive = isPlaying || isPaused;

  return (
    <div
      className="track-position-play-pause relative flex items-center justify-center gap-2 text-lg w-16 cursor-pointer"
      style={{ minWidth: "4rem", maxWidth: "4rem" }}
      onClick={handlePlayPauseClick}
    >
      <div className="track-position-play-pause__status group-hover:hidden flex items-center justify-center">
        {isAwaitingPlayback ? (
          <span className="track-position-play-pause__spinner" role="status" aria-label="Loading track" />
        ) : isCurrentTrackActive ? (
          <span
            className="track-position-play-pause__bars"
            data-playing={isPlaying}
            role="img"
            aria-label={isPlaying ? "Playing" : "Paused"}
          >
            <span className="track-position-play-pause__bar" />
            <span className="track-position-play-pause__bar" />
            <span className="track-position-play-pause__bar" />
          </span>
        ) : (
          position
        )}
      </div>
      <div
        className={`hidden group-hover:flex items-center justify-center ${
          isCurrentTrackActive ? "" : "absolute inset-0"
        }`}
        aria-hidden="true"
      >
        {isAwaitingPlayback ? (
          <span className="track-position-play-pause__spinner" />
        ) : isPlaying ? (
          <FaPause />
        ) : (
          <FaPlay />
        )}
      </div>
    </div>
  );
}
