"use client";

import { FaPlay, FaPause } from "react-icons/fa";

import { usePlayer } from "../player/PlayerContext";
import { PlayStates } from "../player/PlayStates";
import { RingLoader } from "@behindthemusictree/ui";

export interface UploadedTrackPositionPlayPauseProps {
  position: number;
  uuid: string;
  handlePlayPauseClick: (event: React.MouseEvent) => void;
}

export default function UploadedTrackPositionPlayPause({
  position,
  uuid,
  handlePlayPauseClick,
}: UploadedTrackPositionPlayPauseProps) {
  const { playerTrackObject, playState } = usePlayer();
  const isThisTrack = playerTrackObject?.track.id === uuid;

  return (
    <div
      className="track-position-play-pause flex items-center justify-center text-lg w-16 cursor-pointer"
      style={{ minWidth: "64px", maxWidth: "64px" }}
      onClick={handlePlayPauseClick}
    >
      <div className="group-hover:hidden">
        <div>
          {isThisTrack && playState !== PlayStates.STOPPED ? (
            <div className="flex space-x-1 items-end">
              <div
                className={`w-playingbar bg-green-500 h-3 origin-bottom ${
                  playState === PlayStates.PLAYING ? "animate-scale-pulse" : ""
                }`}
              ></div>
              <div
                className={`w-playingbar bg-green-500 h-4 origin-bottom ${
                  playState === PlayStates.PLAYING ? "animate-scale-pulse delay-200" : ""
                }`}
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className={`w-playingbar bg-green-500 h-3 origin-bottom ${
                  playState === PlayStates.PLAYING ? "animate-scale-pulse delay-400" : ""
                }`}
                style={{ animationDelay: "0.3s" }}
              ></div>
            </div>
          ) : (
            position
          )}
        </div>
      </div>
      <div className="hidden group-hover:flex items-center justify-center">
        {isThisTrack && playState === PlayStates.LOADING ? (
          <RingLoader size={16} />
        ) : isThisTrack && playState === PlayStates.PLAYING ? (
          <FaPause />
        ) : (
          <FaPlay />
        )}
      </div>
    </div>
  );
}
