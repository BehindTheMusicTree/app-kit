"use client";

/**
 * Generalized from grow-the-music-tree-frontend's original `PlayerContext.tsx`, which was
 * hard-typed to `UploadedTrackDetailed` and imported grow's `useDownloadTrack`/
 * `useListUploadedTracks` data hooks directly. This version works with a generic `PlayerTrack`
 * shape and an injected async `loadTrack` loader, so both grow's and hear's uploaded-track
 * libraries (or any other track source) can drive it without this package depending on either
 * app's data-fetching hooks or domain types.
 *
 * Playback mechanics (play/pause, volume, duration, `currentTimeRef`) are unchanged from the
 * original. What changed: the "how do we get from a track id to playable audio" step is now the
 * caller's responsibility (`loadTrack`), and `loadTrackForPlayer` takes just a track id instead of
 * a full track object + scope — so a track's title/artists are only known once `loadTrack`
 * resolves, not immediately when playback starts (a deliberate simplification; the original showed
 * the track's title while its audio was still downloading).
 */

import { createContext, useContext, useState, ReactNode, useRef, useEffect, useCallback, useMemo } from "react";
import { PlayStates } from "./PlayStates";

export interface PlayerTrackArtist {
  name: string;
}

/** Minimal shape the player needs to play a track and identify it. Extend as needed per app. */
export interface PlayerTrack {
  id: string;
  streamUrl: string;
  title: string;
  artists?: PlayerTrackArtist[];
}

interface PlayerTrackObject {
  track: PlayerTrack;
  audioElement?: HTMLAudioElement;
  isReady: boolean;
  loadError?: string;
}

interface PlayerContextType {
  playerTrackObject: PlayerTrackObject | null;
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  currentTimeRef: React.MutableRefObject<number>;
  duration: number;
  setDuration: (duration: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  playState: PlayStates;
  setPlayState: (state: PlayStates) => void;
  handlePlayPauseAction: () => void;
  loadTrackForPlayer: (trackId: string) => void;
  isLoading: boolean;
  handleNextTrack: (
    trackList: PlayerTrack[],
    currentTrack: PlayerTrack,
    onTrackChange: (track: PlayerTrack) => void,
  ) => void;
  handlePreviousTrack: (
    trackList: PlayerTrack[],
    currentTrack: PlayerTrack,
    onTrackChange: (track: PlayerTrack) => void,
  ) => void;
  onTrackEnd: (() => void) | null;
  setOnTrackEnd: (callback: (() => void) | null) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

interface PlayerProviderProps {
  children: ReactNode;
  /** Resolves a track id to a playable `PlayerTrack` (with a ready-to-use `streamUrl`). */
  loadTrack: (trackId: string) => Promise<PlayerTrack>;
}

export function PlayerProvider({ children, loadTrack }: PlayerProviderProps) {
  const [playerTrackObject, setPlayerTrackObject] = useState<PlayerTrackObject | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50);
  const [playState, setPlayState] = useState<PlayStates>(PlayStates.STOPPED);
  const [isLoading, setIsLoading] = useState(false);
  const [onTrackEnd, setOnTrackEnd] = useState<(() => void) | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const currentTimeRef = useRef(0);
  const onTrackEndRef = useRef(onTrackEnd);
  onTrackEndRef.current = onTrackEnd;

  const loadTrackForPlayer = useCallback(
    (trackId: string) => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      }

      setPlayerTrackObject(null);
      setIsLoading(true);
      setPlayState(PlayStates.LOADING);

      loadTrack(trackId)
        .then((track) => {
          const audio = new Audio(track.streamUrl);
          audio.volume = volume / 100;
          audioElementRef.current = audio;

          audio.addEventListener("loadedmetadata", () => {
            setDuration(audio.duration);
          });

          audio.addEventListener("timeupdate", () => {
            // Only update ref - no state updates to prevent re-renders
            currentTimeRef.current = audio.currentTime;
          });

          audio.addEventListener("ended", () => {
            setPlayState(PlayStates.STOPPED);
            setIsPlaying(false);
            onTrackEndRef.current?.();
          });

          audio.addEventListener("error", (e) => {
            console.error("Audio error event fired:", e);
          });

          setPlayerTrackObject({ track, audioElement: audio, isReady: true, loadError: undefined });
          setPlayState(PlayStates.PLAYING);
          setIsPlaying(true);
          audio.play().catch((error) => {
            console.error("Error auto-playing audio:", error);
          });
        })
        .catch((error) => {
          console.error("Error loading track:", error);
          setPlayState(PlayStates.STOPPED);
          setPlayerTrackObject({
            track: { id: trackId, streamUrl: "", title: "" },
            isReady: false,
            loadError: error?.message ?? "Failed to load track",
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [loadTrack, volume],
  );

  const handleNextTrack = useCallback(
    (trackList: PlayerTrack[], currentTrack: PlayerTrack, onTrackChange: (track: PlayerTrack) => void) => {
      if (!trackList || !currentTrack) return;

      const currentIndex = trackList.findIndex((track) => track.id === currentTrack.id);
      if (currentIndex === -1) return;

      const nextIndex = currentIndex + 1;
      if (nextIndex < trackList.length) {
        const nextTrack = trackList[nextIndex];
        onTrackChange(nextTrack);
        loadTrackForPlayer(nextTrack.id);
      }
    },
    [loadTrackForPlayer],
  );

  const handlePreviousTrack = useCallback(
    (trackList: PlayerTrack[], currentTrack: PlayerTrack, onTrackChange: (track: PlayerTrack) => void) => {
      if (!trackList || !currentTrack) return;

      const currentIndex = trackList.findIndex((track) => track.id === currentTrack.id);
      if (currentIndex === -1) return;

      const previousIndex = currentIndex - 1;
      if (previousIndex >= 0) {
        const previousTrack = trackList[previousIndex];
        onTrackChange(previousTrack);
        loadTrackForPlayer(previousTrack.id);
      }
    },
    [loadTrackForPlayer],
  );

  // Cleanup audio element on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []);

  const handlePlayPauseAction = useCallback(() => {
    if (playState === PlayStates.LOADING) return;
    if (!playerTrackObject?.isReady) return;

    const audioElement = playerTrackObject.audioElement || audioElementRef.current;
    if (!audioElement) return;

    if (playState === PlayStates.PLAYING) {
      audioElement.pause();
      setPlayState(PlayStates.PAUSED);
      setIsPlaying(false);
    } else {
      audioElement.play().catch((error) => {
        console.error("Error playing audio:", error);
      });
      setPlayState(PlayStates.PLAYING);
      setIsPlaying(true);
    }
  }, [playerTrackObject?.isReady, playerTrackObject?.audioElement, playState]);

  const contextValue = useMemo(
    () => ({
      playerTrackObject,
      isPlaying,
      setIsPlaying,
      currentTimeRef,
      duration,
      setDuration,
      volume,
      setVolume,
      playState,
      setPlayState,
      handlePlayPauseAction,
      loadTrackForPlayer,
      isLoading,
      handleNextTrack,
      handlePreviousTrack,
      onTrackEnd,
      setOnTrackEnd,
    }),
    [
      playerTrackObject,
      isPlaying,
      duration,
      volume,
      playState,
      isLoading,
      handlePlayPauseAction,
      loadTrackForPlayer,
      handleNextTrack,
      handlePreviousTrack,
      onTrackEnd,
    ],
  );

  return <PlayerContext.Provider value={contextValue}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}

// Custom hook for components that need real-time currentTime updates
export function useCurrentTime() {
  const { currentTimeRef } = usePlayer();
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(currentTimeRef.current);
    }, 100); // Update every 100ms for smooth UI

    return () => clearInterval(interval);
  }, [currentTimeRef]);

  return currentTime;
}
