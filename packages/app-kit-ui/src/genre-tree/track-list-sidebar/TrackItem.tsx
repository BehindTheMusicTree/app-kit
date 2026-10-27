"use client";

import { ReactNode } from "react";

import { usePlayer } from "@behindthemusictree/app-kit/player";
import { useTrackList } from "@behindthemusictree/app-kit/genre-tree";
import TrackPositionPlayPause from "../TrackPositionPlayPause";
import { TrackBase } from "@behindthemusictree/app-kit/genre-tree";
import { isSong, songUnplayableReason } from "@behindthemusictree/app-kit/genre-tree";
import { MusicBrainzRecordingLink } from "../MusicBrainzRecordingLink";
import { UnplayableReason } from "../UnplayableReason";
import { ArtistNames, RenderArtistLink } from "@behindthemusictree/app-kit/genre-tree";

export interface TrackItemProps<T extends TrackBase> {
  track: T;
  position: number;
  renderDuration?: (track: T) => ReactNode;
  renderActions?: (track: T) => ReactNode;
  /** When set, artist names render through it (e.g. a router `Link`). */
  renderArtistLink?: RenderArtistLink;
}

export default function TrackItem<T extends TrackBase>({
  track,
  position,
  renderDuration,
  renderActions,
  renderArtistLink,
}: TrackItemProps<T>) {
  const { handlePlayPauseAction, playerTrackObject, loadTrackForPlayer } = usePlayer();
  const { trackList, toTrackAtPosition } = useTrackList<T>();
  const scope = trackList?.origin?.scope ?? null;
  const unplayableReason = isSong(track) ? songUnplayableReason(track) : null;

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
      className={`track-item flex h-14 text-[var(--color-text)] ${unplayableReason ? "opacity-50" : "hover:bg-[var(--color-surface-muted)] group"}`}
      title={unplayableReason ?? undefined}
    >
      {unplayableReason ? (
        <div
          className="flex items-center justify-center text-lg w-16"
          style={{ minWidth: "4rem", maxWidth: "4rem" }}
          aria-disabled="true"
        >
          {position}
        </div>
      ) : (
        <TrackPositionPlayPause position={position} uuid={track.uuid} handlePlayPauseClick={handlePlayPauseClick} />
      )}
      <div className="title-artist-container flex flex-col items-start justify-center w-1/2">
        <div className="flex max-w-full items-center gap-2">
          <div className="title text-lg font-bold text-[var(--color-text)] max-w-full truncate">{track.title}</div>
          {isSong(track) && <MusicBrainzRecordingLink song={track} />}
        </div>
        {track.artists && track.artists.length > 0 ? (
          <div className="artist text-base max-w-full truncate text-[var(--color-text-muted)]">
            <ArtistNames artists={track.artists} renderArtistLink={renderArtistLink} />
          </div>
        ) : (
          ""
        )}
        {unplayableReason && (
          <div className="text-xs">
            <UnplayableReason reason={unplayableReason} />
          </div>
        )}
      </div>
      <div className="album-name items-start justify-center w-1/3 ml-2 max-w-full truncate text-[var(--color-text-muted)]">
        {track.album ? track.album.name : ""}
      </div>
      <div className="genre-name-container flex items-center justify-end w-1/6">
        {track.genre ? (
          <div className="genre-name font-bold p-1 border border-[var(--color-text-muted)] text-xs max-w-full truncate">{track.genre.name}</div>
        ) : (
          ""
        )}
      </div>
      <div
        className="duration flex text-base w-16 items-center justify-center"
        style={{ minWidth: "4rem", maxWidth: "4rem" }}
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
