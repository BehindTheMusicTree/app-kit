"use client";

import { MdMoreVert } from "react-icons/md";

import { formatTime } from "../lib/formatting";
import { usePlayer } from "../../player/PlayerContext";
import { useTrackList } from "../TrackListContext";
import { useTrackEdition } from "../useTrackEdition";
import UploadedTrackPositionPlayPause from "../UploadedTrackPositionPlayPause";
import { TrackDetailed } from "../schemas/track/detailed";

export interface TrackItemProps {
  track: TrackDetailed;
  position: number;
  getBackendBaseUrl: () => string;
}

export default function TrackItem({ track, position, getBackendBaseUrl }: TrackItemProps) {
  const { handlePlayPauseAction, playerTrackObject, loadTrackForPlayer } = usePlayer();
  const { trackList, toTrackAtPosition } = useTrackList();
  const scope = trackList?.origin?.scope ?? null;
  const { showEditPopup, TrackEditionComponent } = useTrackEdition(scope, getBackendBaseUrl);

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (track.kind !== "uploaded") return;
    showEditPopup(track);
  };

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
    <>
      <div className="track-item flex h-14 text-gray-400 hover:bg-gray-900 group">
        <UploadedTrackPositionPlayPause position={position} uuid={track.uuid} handlePlayPauseClick={handlePlayPauseClick} />
        <div className="title-artist-container flex flex-col items-start justify-center w-1/2">
          <div className="title text-lg font-bold text-gray-300 text-overflow">{track.title}</div>
          {track.artists && track.artists.length > 0 ? (
            <div className="artist text-base text-overflow">{track.artists.map((artist) => artist.name).join(", ")}</div>
          ) : (
            ""
          )}
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
          {track.kind === "uploaded" ? formatTime(track.file.durationInSec) : ""}
        </div>
        {track.kind === "uploaded" && (
          <div
            className="edit flex text-base w-6 items-center justify-center mr-2 cursor-pointer"
            onClick={handleEditClick}
          >
            <MdMoreVert size={20} />
          </div>
        )}
      </div>
      {TrackEditionComponent}
    </>
  );
}
