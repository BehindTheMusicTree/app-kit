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
 *
 * `PlayerTrack` is a discriminated union on `kind`: `"audio"` tracks play through a real
 * `HTMLAudioElement`, `"youtube"` tracks play through a YouTube IFrame player mounted into the
 * `PlayerVideoSurface` component. Both are driven through the same `MediaController` interface so
 * play/pause/seek/volume code never needs to branch on track kind.
 */

import { createContext, useContext, useState, ReactNode, useRef, useEffect, useCallback, useMemo } from "react";
import { PlayStates } from "./PlayStates";
import { MediaController, AudioMediaController, YoutubeMediaController } from "./MediaController";
import { loadYoutubeIframeApi } from "./youtubeIframeApi";

export interface PlayerTrackArtist {
  name: string;
}

interface PlayerTrackBase {
  id: string;
  title: string;
  artists?: PlayerTrackArtist[];
}

export interface AudioPlayerTrack extends PlayerTrackBase {
  kind: "audio";
  streamUrl: string;
}

export interface YoutubePlayerTrack extends PlayerTrackBase {
  kind: "youtube";
  youtubeVideoId: string;
}

/** Minimal shape the player needs to play a track and identify it. Extend as needed per app. */
export type PlayerTrack = AudioPlayerTrack | YoutubePlayerTrack;

interface PlayerTrackObject {
  track: PlayerTrack;
  mediaController?: MediaController;
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
  /** Container the YouTube IFrame player mounts into. Render `<PlayerVideoSurface />` to attach it. */
  videoContainerRef: React.RefObject<HTMLDivElement>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

interface PlayerProviderProps {
  children: ReactNode;
  /** Resolves a track id to a playable `PlayerTrack`. */
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
  const youtubePlayerRef = useRef<YT.Player | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef(0);
  const onTrackEndRef = useRef(onTrackEnd);
  useEffect(() => {
    onTrackEndRef.current = onTrackEnd;
  }, [onTrackEnd]);

  // YouTube's IFrame API has no continuous timeupdate-style event, so poll it into the same
  // currentTimeRef audio tracks update via their "timeupdate" listener. Also doubles as the
  // duration source, since a video's duration isn't reliably known right after loadVideoById.
  useEffect(() => {
    const interval = setInterval(() => {
      const player = youtubePlayerRef.current;
      if (player) {
        currentTimeRef.current = player.getCurrentTime();
        setDuration(player.getDuration());
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const handleYoutubeStateChange = useCallback((event: YT.OnStateChangeEvent) => {
    if (event.data === window.YT.PlayerState.ENDED) {
      setPlayState(PlayStates.STOPPED);
      setIsPlaying(false);
      onTrackEndRef.current?.();
    }
  }, []);

  const loadAudioTrack = useCallback(
    (track: AudioPlayerTrack) => {
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

      setPlayerTrackObject({ track, mediaController: new AudioMediaController(audio), isReady: true, loadError: undefined });
      setPlayState(PlayStates.PLAYING);
      setIsPlaying(true);
      audio.play().catch((error) => {
        console.error("Error auto-playing audio:", error);
      });
    },
    [volume],
  );

  const loadYoutubeTrack = useCallback(
    async (track: YoutubePlayerTrack) => {
      if (youtubePlayerRef.current) {
        const player = youtubePlayerRef.current;
        player.loadVideoById(track.youtubeVideoId);
        setPlayerTrackObject({ track, mediaController: new YoutubeMediaController(player), isReady: true, loadError: undefined });
        setPlayState(PlayStates.PLAYING);
        setIsPlaying(true);
        player.playVideo();
        return;
      }

      const container = videoContainerRef.current;
      if (!container) {
        throw new Error("PlayerVideoSurface must be rendered before a YouTube track can be loaded");
      }

      const YT = await loadYoutubeIframeApi();

      await new Promise<void>((resolve) => {
        const player = new YT.Player(container, {
          videoId: track.youtubeVideoId,
          playerVars: { autoplay: 1 },
          events: {
            onReady: () => {
              youtubePlayerRef.current = player;
              setPlayerTrackObject({ track, mediaController: new YoutubeMediaController(player), isReady: true, loadError: undefined });
              setPlayState(PlayStates.PLAYING);
              setIsPlaying(true);
              player.playVideo();
              resolve();
            },
            onStateChange: handleYoutubeStateChange,
            onError: (event: YT.OnErrorEvent) => {
              console.error("YouTube player error event fired:", event.data);
            },
          },
        });
      });
    },
    [handleYoutubeStateChange],
  );

  const loadTrackForPlayer = useCallback(
    (trackId: string) => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        audioElementRef.current = null;
      }
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.pauseVideo();
      }

      setPlayerTrackObject(null);
      setIsLoading(true);
      setPlayState(PlayStates.LOADING);

      loadTrack(trackId)
        .then((track) => (track.kind === "youtube" ? loadYoutubeTrack(track) : loadAudioTrack(track)))
        .catch((error) => {
          console.error("Error loading track:", error);
          setPlayState(PlayStates.STOPPED);
          setPlayerTrackObject({
            track: { id: trackId, kind: "audio", streamUrl: "", title: "" },
            isReady: false,
            loadError: error?.message ?? "Failed to load track",
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [loadTrack, loadAudioTrack, loadYoutubeTrack],
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

  // Cleanup media on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, []);

  const handlePlayPauseAction = useCallback(() => {
    if (playState === PlayStates.LOADING) return;
    if (!playerTrackObject?.isReady) return;

    const mediaController = playerTrackObject.mediaController;
    if (!mediaController) return;

    if (playState === PlayStates.PLAYING) {
      mediaController.pause();
      setPlayState(PlayStates.PAUSED);
      setIsPlaying(false);
    } else {
      mediaController.play();
      setPlayState(PlayStates.PLAYING);
      setIsPlaying(true);
    }
  }, [playerTrackObject?.isReady, playerTrackObject?.mediaController, playState]);

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
      videoContainerRef,
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

/** Mounts the YouTube IFrame player. Only needed by apps that play `"youtube"`-kind tracks. */
export function PlayerVideoSurface({ className }: { className?: string }) {
  const { videoContainerRef } = usePlayer();
  return <div ref={videoContainerRef} className={className} />;
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
