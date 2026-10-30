"use client";

import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { formatTime, useTrackList } from "@behindthemusictree/app-kit/genre-tree";
import { PlayStates, useCurrentTime, usePlayer } from "@behindthemusictree/app-kit/player";

export default function PlayerControls() {
  const {
    duration,
    handlePlayPauseAction,
    isLoading,
    playState,
    playerTrackObject,
    seekTo,
    setVolume,
    volume,
  } = usePlayer();
  const { hasNextTrack, hasPreviousTrack, playNextTrack, playPreviousTrack } = useTrackList();
  const currentTime = useCurrentTime();
  const isBusy = isLoading || playState === PlayStates.LOADING;
  const isReady = !!playerTrackObject?.isReady && !isBusy && !playerTrackObject.loadError;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeCurrentTime = Number.isFinite(currentTime) ? Math.max(0, Math.min(currentTime, safeDuration)) : 0;
  const isPlaying = playState === PlayStates.PLAYING;

  return (
    <section
      aria-label="Player controls"
      className="player-controls flex shrink-0 flex-col gap-2 border-b border-zinc-800 px-3 py-2 text-zinc-200"
    >
      <div className="flex min-w-0 items-center gap-2 text-xs tabular-nums text-zinc-400">
        <span aria-label="Elapsed time">{formatTime(safeCurrentTime)}</span>
        <input
          aria-label="Seek"
          className="h-1 min-w-0 flex-1 cursor-pointer accent-white disabled:cursor-not-allowed disabled:opacity-40"
          type="range"
          min={0}
          max={safeDuration}
          step={0.1}
          value={safeCurrentTime}
          disabled={!isReady || safeDuration <= 0}
          onChange={(event) => seekTo(Number(event.currentTarget.value))}
        />
        <span aria-label="Duration">{formatTime(safeDuration)}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <button
            type="button"
            aria-label="Previous track"
            title="Previous track"
            disabled={!isReady || !hasPreviousTrack}
            onClick={playPreviousTrack}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SkipBack aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
            disabled={!isReady}
            onClick={handlePlayPauseAction}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="h-4 w-4" fill="currentColor" />
            ) : (
              <Play aria-hidden="true" className="h-4 w-4" fill="currentColor" />
            )}
          </button>
          <button
            type="button"
            aria-label="Next track"
            title="Next track"
            disabled={!isReady || !hasNextTrack}
            onClick={playNextTrack}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SkipForward aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <label className="flex w-24 shrink-0 items-center gap-2 text-zinc-400 sm:w-28">
          {volume === 0 ? (
            <VolumeX aria-hidden="true" className="h-4 w-4 shrink-0" />
          ) : (
            <Volume2 aria-hidden="true" className="h-4 w-4 shrink-0" />
          )}
          <span className="sr-only">Volume</span>
          <input
            aria-label="Volume"
            className="h-1 min-w-0 flex-1 cursor-pointer accent-white disabled:cursor-not-allowed disabled:opacity-40"
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            disabled={!isReady}
            onChange={(event) => setVolume(Number(event.currentTarget.value))}
          />
        </label>
      </div>
    </section>
  );
}
