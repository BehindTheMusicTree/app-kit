"use client";

import { FaPlay, FaPause } from "react-icons/fa";

import { usePlayer } from "@behindthemusictree/app-kit/player";
import { PlayStates } from "@behindthemusictree/app-kit/player";
import { RingLoader } from "@behindthemusictree/ui";

export interface TrackPositionPlayPauseProps {
  position: number;
  uuid: string;
  handlePlayPauseClick: (event: React.MouseEvent) => void;
}

export default function TrackPositionPlayPause({ position, uuid, handlePlayPauseClick }: TrackPositionPlayPauseProps) {
  const { playerTrackObject, playState } = usePlayer();
  const isThisTrack = playerTrackObject?.track.id === uuid;
  const isCurrentTrackActive = isThisTrack && playState !== PlayStates.STOPPED;
  const isPlaying = isThisTrack && playState === PlayStates.PLAYING;
  const isLoading = isThisTrack && playState === PlayStates.LOADING;

  return (
    <div
      className="track-position-play-pause relative flex items-center justify-center gap-2 text-lg w-16 cursor-pointer"
      style={{ minWidth: "4rem", maxWidth: "4rem" }}
      onClick={handlePlayPauseClick}
    >
      <div className="track-position-play-pause__status group-hover:hidden flex items-center justify-center">
        {isCurrentTrackActive ? (
          isLoading ? (
            <RingLoader size={16} />
          ) : (
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
          )
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
        {isLoading ? <RingLoader size={16} /> : isPlaying ? <FaPause /> : <FaPlay />}
      </div>
    </div>
  );
}
