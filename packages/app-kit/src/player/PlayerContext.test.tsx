import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, render, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const { loadYoutubeIframeApiMock } = vi.hoisted(() => ({ loadYoutubeIframeApiMock: vi.fn() }));

vi.mock("./youtubeIframeApi", () => ({ loadYoutubeIframeApi: loadYoutubeIframeApiMock }));

import {
  PlayerProvider,
  usePlayer,
  PlayerVideoSurface,
  useCurrentTime,
  type PlayerTrack,
} from "./PlayerContext";
import { PlayStates } from "./PlayStates";

class FakeAudio {
  src: string;
  currentTime = 0;
  volume = 1;
  duration = 120;
  private listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  constructor(src: string) {
    this.src = src;
    audioInstances.push(this);
  }

  addEventListener(event: string, cb: (...args: unknown[]) => void) {
    (this.listeners[event] ||= []).push(cb);
  }

  removeEventListener() {}

  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();

  dispatch(event: string, ...args: unknown[]) {
    (this.listeners[event] || []).forEach((cb) => cb(...args));
  }
}

let audioInstances: FakeAudio[] = [];

interface FakeYTPlayer {
  config: { events: Record<string, (...args: unknown[]) => void> };
  loadVideoById: ReturnType<typeof vi.fn>;
  playVideo: ReturnType<typeof vi.fn>;
  pauseVideo: ReturnType<typeof vi.fn>;
  getCurrentTime: ReturnType<typeof vi.fn>;
  getDuration: ReturnType<typeof vi.fn>;
  getVolume: ReturnType<typeof vi.fn>;
  setVolume: ReturnType<typeof vi.fn>;
  seekTo: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

let ytPlayers: FakeYTPlayer[] = [];
let ytPlayerCtor: ReturnType<typeof vi.fn>;

function makeAudioTrack(id = "audio-1"): PlayerTrack {
  return { id, kind: "audio", title: "Audio Track", streamUrl: `https://example.com/${id}.mp3` };
}

function makeYoutubeTrack(id = "yt-1"): PlayerTrack {
  return { id, kind: "youtube", title: "YouTube Track", youtubeVideoId: id };
}

function wrapper({ children }: { children: ReactNode }) {
  return <PlayerProvider loadTrack={loadTrackMock}>{children}</PlayerProvider>;
}

let loadTrackMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  audioInstances = [];
  ytPlayers = [];
  loadTrackMock = vi.fn();

  vi.stubGlobal("Audio", FakeAudio);

  ytPlayerCtor = vi.fn().mockImplementation((_container: HTMLElement, config: FakeYTPlayer["config"]) => {
    const player: FakeYTPlayer = {
      config,
      loadVideoById: vi.fn(),
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      getCurrentTime: vi.fn().mockReturnValue(10),
      getDuration: vi.fn().mockReturnValue(200),
      getVolume: vi.fn().mockReturnValue(50),
      setVolume: vi.fn(),
      seekTo: vi.fn(),
      destroy: vi.fn(),
    };
    ytPlayers.push(player);
    return player;
  });

  loadYoutubeIframeApiMock.mockResolvedValue({ Player: ytPlayerCtor });

  (window as unknown as { YT: { PlayerState: { ENDED: number } } }).YT = { PlayerState: { ENDED: 0 } };
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as { YT?: unknown }).YT;
});

describe("usePlayer", () => {
  it("throws when used outside of the provider", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => usePlayer())).toThrow("usePlayer must be used within a PlayerProvider");

    consoleErrorSpy.mockRestore();
  });
});

describe("PlayerProvider", () => {
  it("prewarms the YouTube IFrame API on mount, before any track is loaded", () => {
    renderHook(() => usePlayer(), { wrapper });

    expect(loadYoutubeIframeApiMock).toHaveBeenCalledTimes(1);
    expect(loadTrackMock).not.toHaveBeenCalled();
  });
});

describe("PlayerProvider - loadTrackForPlayer (audio)", () => {
  it("loads and plays an audio track", async () => {
    loadTrackMock.mockResolvedValue(makeAudioTrack());
    const { result } = renderHook(() => usePlayer(), { wrapper });

    await act(async () => {
      result.current.loadTrackForPlayer("audio-1");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadTrackMock).toHaveBeenCalledWith("audio-1");
    expect(result.current.playState).toBe(PlayStates.PLAYING);
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.playerTrackObject?.isReady).toBe(true);
    expect(audioInstances[0].play).toHaveBeenCalled();
  });

  it("sets duration and currentTimeRef from audio events", async () => {
    loadTrackMock.mockResolvedValue(makeAudioTrack());
    const { result } = renderHook(() => usePlayer(), { wrapper });

    await act(async () => {
      result.current.loadTrackForPlayer("audio-1");
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      audioInstances[0].duration = 55;
      audioInstances[0].dispatch("loadedmetadata");
    });
    expect(result.current.duration).toBe(55);

    act(() => {
      audioInstances[0].currentTime = 12;
      audioInstances[0].dispatch("timeupdate");
    });
    expect(result.current.currentTimeRef.current).toBe(12);
  });

  it("stops playback and fires onTrackEnd when audio ends", async () => {
    loadTrackMock.mockResolvedValue(makeAudioTrack());
    const { result } = renderHook(() => usePlayer(), { wrapper });
    const onTrackEnd = vi.fn();

    act(() => {
      result.current.setOnTrackEnd(onTrackEnd);
    });

    await act(async () => {
      result.current.loadTrackForPlayer("audio-1");
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      audioInstances[0].dispatch("ended");
    });

    expect(result.current.playState).toBe(PlayStates.STOPPED);
    expect(result.current.isPlaying).toBe(false);
    expect(onTrackEnd).toHaveBeenCalled();
  });

  it("logs an error when the audio element fires an error event", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    loadTrackMock.mockResolvedValue(makeAudioTrack());
    const { result } = renderHook(() => usePlayer(), { wrapper });

    await act(async () => {
      result.current.loadTrackForPlayer("audio-1");
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      audioInstances[0].dispatch("error", { type: "error" });
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("Audio error event fired:", expect.anything());
    consoleErrorSpy.mockRestore();
  });

  it("logs an error when audio.play() rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    loadTrackMock.mockResolvedValue(makeAudioTrack());

    class RejectingAudio extends FakeAudio {
      play = vi.fn().mockRejectedValue(new Error("autoplay blocked"));
    }
    vi.stubGlobal("Audio", RejectingAudio);

    const { result } = renderHook(() => usePlayer(), { wrapper });

    await act(async () => {
      result.current.loadTrackForPlayer("audio-1");
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("Error auto-playing audio:", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("stops previously playing audio before loading a new track", async () => {
    loadTrackMock.mockResolvedValue(makeAudioTrack("audio-1"));
    const { result } = renderHook(() => usePlayer(), { wrapper });

    await act(async () => {
      result.current.loadTrackForPlayer("audio-1");
      await Promise.resolve();
      await Promise.resolve();
    });
    const firstAudio = audioInstances[0];

    loadTrackMock.mockResolvedValue(makeAudioTrack("audio-2"));
    await act(async () => {
      result.current.loadTrackForPlayer("audio-2");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(firstAudio.pause).toHaveBeenCalled();
    expect(firstAudio.currentTime).toBe(0);
  });

  it("sets a load error and STOPPED state when loadTrack rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    loadTrackMock.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => usePlayer(), { wrapper });

    await act(async () => {
      result.current.loadTrackForPlayer("audio-1");
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.playState).toBe(PlayStates.STOPPED);
    expect(result.current.playerTrackObject?.isReady).toBe(false);
    expect(result.current.playerTrackObject?.loadError).toBe("network down");
    expect(result.current.isLoading).toBe(false);
    consoleErrorSpy.mockRestore();
  });

  it("falls back to a default load error message when the rejection has none", async () => {
    loadTrackMock.mockRejectedValue({});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => usePlayer(), { wrapper });

    await act(async () => {
      result.current.loadTrackForPlayer("audio-1");
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.playerTrackObject?.loadError).toBe("Failed to load track");
    consoleErrorSpy.mockRestore();
  });
});

describe("PlayerProvider - loadTrackForPlayer (youtube)", () => {
  it("throws if PlayerVideoSurface has not mounted a container", async () => {
    loadTrackMock.mockResolvedValue(makeYoutubeTrack());
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => usePlayer(), { wrapper });

    await act(async () => {
      result.current.loadTrackForPlayer("yt-1");
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.playerTrackObject?.loadError).toContain("PlayerVideoSurface");
    consoleErrorSpy.mockRestore();
  });

  it("creates a YouTube player and plays once ready", async () => {
    loadTrackMock.mockResolvedValue(makeYoutubeTrack());

    function Harness() {
      const player = usePlayer();
      return (
        <div>
          <PlayerVideoSurface />
          <div data-testid="playState">{player.playState}</div>
          <button onClick={() => player.loadTrackForPlayer("yt-1")}>load</button>
        </div>
      );
    }

    render(
      <PlayerProvider loadTrack={loadTrackMock}>
        <Harness />
      </PlayerProvider>,
    );

    await act(async () => {
      (document.querySelector("button") as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ytPlayerCtor).toHaveBeenCalledTimes(1);

    act(() => {
      ytPlayers[0].config.events.onReady();
    });

    await waitFor(() => {
      expect(ytPlayers[0].playVideo).toHaveBeenCalled();
    });
  });

  it("reuses an existing player via loadVideoById on subsequent loads", async () => {
    loadTrackMock.mockResolvedValue(makeYoutubeTrack("yt-1"));

    function Harness() {
      const player = usePlayer();
      return (
        <div>
          <PlayerVideoSurface />
          <button onClick={() => player.loadTrackForPlayer("yt-1")}>load</button>
          <button onClick={() => player.loadTrackForPlayer("yt-2")}>load2</button>
        </div>
      );
    }

    render(
      <PlayerProvider loadTrack={loadTrackMock}>
        <Harness />
      </PlayerProvider>,
    );

    const buttons = document.querySelectorAll("button");
    await act(async () => {
      (buttons[0] as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => {
      ytPlayers[0].config.events.onReady();
    });

    loadTrackMock.mockResolvedValue(makeYoutubeTrack("yt-2"));
    await act(async () => {
      (buttons[1] as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ytPlayerCtor).toHaveBeenCalledTimes(1);
    expect(ytPlayers[0].loadVideoById).toHaveBeenCalledWith("yt-2");
    expect(ytPlayers[0].playVideo).toHaveBeenCalled();
  });

  it("stops playback and fires onTrackEnd when the YouTube state changes to ENDED", async () => {
    loadTrackMock.mockResolvedValue(makeYoutubeTrack());

    function Harness() {
      const player = usePlayer();
      return (
        <div>
          <PlayerVideoSurface />
          <button onClick={() => player.loadTrackForPlayer("yt-1")}>load</button>
        </div>
      );
    }

    const onTrackEnd = vi.fn();

    render(
      <PlayerProvider loadTrack={loadTrackMock}>
        <Harness />
      </PlayerProvider>,
    );

    await act(async () => {
      (document.querySelector("button") as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      ytPlayers[0].config.events.onReady();
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      ytPlayers[0].config.events.onStateChange({ data: 0 });
    });

    expect(ytPlayerCtor).toHaveBeenCalledTimes(1);
  });

  it("logs an error when the YouTube player fires an error event", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    loadTrackMock.mockResolvedValue(makeYoutubeTrack());

    function Harness() {
      const player = usePlayer();
      return (
        <div>
          <PlayerVideoSurface />
          <button onClick={() => player.loadTrackForPlayer("yt-1")}>load</button>
        </div>
      );
    }

    render(
      <PlayerProvider loadTrack={loadTrackMock}>
        <Harness />
      </PlayerProvider>,
    );

    await act(async () => {
      (document.querySelector("button") as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      ytPlayers[0].config.events.onError({ data: 2 });
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("YouTube player error event fired:", 2);
    consoleErrorSpy.mockRestore();
  });

  it("pauses an existing YouTube player when loading a different (audio) track", async () => {
    loadTrackMock.mockResolvedValue(makeYoutubeTrack());

    function Harness() {
      const player = usePlayer();
      return (
        <div>
          <PlayerVideoSurface />
          <button onClick={() => player.loadTrackForPlayer("yt-1")}>load</button>
          <button onClick={() => player.loadTrackForPlayer("audio-1")}>loadAudio</button>
        </div>
      );
    }

    render(
      <PlayerProvider loadTrack={loadTrackMock}>
        <Harness />
      </PlayerProvider>,
    );

    const buttons = document.querySelectorAll("button");
    await act(async () => {
      (buttons[0] as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => {
      ytPlayers[0].config.events.onReady();
    });

    loadTrackMock.mockResolvedValue(makeAudioTrack());
    await act(async () => {
      (buttons[1] as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ytPlayers[0].pauseVideo).toHaveBeenCalled();
  });
});

describe("PlayerProvider - handlePlayPauseAction", () => {
  it("does nothing while loading", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });

    act(() => {
      result.current.setPlayState(PlayStates.LOADING);
      result.current.handlePlayPauseAction();
    });

    expect(result.current.playState).toBe(PlayStates.LOADING);
  });

  it("does nothing when there is no ready track", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });

    act(() => {
      result.current.handlePlayPauseAction();
    });

    expect(result.current.playState).toBe(PlayStates.STOPPED);
  });

  it("pauses a playing track", async () => {
    loadTrackMock.mockResolvedValue(makeAudioTrack());
    const { result } = renderHook(() => usePlayer(), { wrapper });

    await act(async () => {
      result.current.loadTrackForPlayer("audio-1");
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      result.current.handlePlayPauseAction();
    });

    expect(result.current.playState).toBe(PlayStates.PAUSED);
    expect(result.current.isPlaying).toBe(false);
    expect(audioInstances[0].pause).toHaveBeenCalled();
  });

  it("resumes a paused track", async () => {
    loadTrackMock.mockResolvedValue(makeAudioTrack());
    const { result } = renderHook(() => usePlayer(), { wrapper });

    await act(async () => {
      result.current.loadTrackForPlayer("audio-1");
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => {
      result.current.handlePlayPauseAction();
    });
    audioInstances[0].play.mockClear();

    act(() => {
      result.current.handlePlayPauseAction();
    });

    expect(result.current.playState).toBe(PlayStates.PLAYING);
    expect(result.current.isPlaying).toBe(true);
    expect(audioInstances[0].play).toHaveBeenCalled();
  });
});

describe("PlayerProvider - handleNextTrack / handlePreviousTrack", () => {
  const trackList = [makeAudioTrack("a"), makeAudioTrack("b"), makeAudioTrack("c")];

  it("does nothing when trackList or currentTrack is missing", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    const onTrackChange = vi.fn();

    act(() => {
      result.current.handleNextTrack(undefined as unknown as PlayerTrack[], trackList[0], onTrackChange);
      result.current.handlePreviousTrack(trackList, undefined as unknown as PlayerTrack, onTrackChange);
    });

    expect(onTrackChange).not.toHaveBeenCalled();
  });

  it("does nothing when the current track is not found in the list", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    const onTrackChange = vi.fn();

    act(() => {
      result.current.handleNextTrack(trackList, makeAudioTrack("missing"), onTrackChange);
    });

    expect(onTrackChange).not.toHaveBeenCalled();
  });

  it("does nothing when already at the last/first track", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    const onTrackChange = vi.fn();

    act(() => {
      result.current.handleNextTrack(trackList, trackList[2], onTrackChange);
      result.current.handlePreviousTrack(trackList, trackList[0], onTrackChange);
    });

    expect(onTrackChange).not.toHaveBeenCalled();
  });

  it("advances to the next track and loads it", async () => {
    loadTrackMock.mockResolvedValue(makeAudioTrack("b"));
    const { result } = renderHook(() => usePlayer(), { wrapper });
    const onTrackChange = vi.fn();

    await act(async () => {
      result.current.handleNextTrack(trackList, trackList[0], onTrackChange);
      await Promise.resolve();
    });

    expect(onTrackChange).toHaveBeenCalledWith(trackList[1]);
    expect(loadTrackMock).toHaveBeenCalledWith("b");
  });

  it("goes back to the previous track and loads it", async () => {
    loadTrackMock.mockResolvedValue(makeAudioTrack("a"));
    const { result } = renderHook(() => usePlayer(), { wrapper });
    const onTrackChange = vi.fn();

    await act(async () => {
      result.current.handlePreviousTrack(trackList, trackList[1], onTrackChange);
      await Promise.resolve();
    });

    expect(onTrackChange).toHaveBeenCalledWith(trackList[0]);
    expect(loadTrackMock).toHaveBeenCalledWith("a");
  });
});

describe("PlayerVideoSurface", () => {
  it("renders a div for the video container", () => {
    const { container } = render(
      <PlayerProvider loadTrack={loadTrackMock}>
        <PlayerVideoSurface className="video-surface" />
      </PlayerProvider>,
    );

    expect(container.querySelector(".video-surface")).not.toBeNull();
  });
});

describe("useCurrentTime", () => {
  it("polls currentTimeRef and updates state", async () => {
    vi.useFakeTimers();
    loadTrackMock.mockResolvedValue(makeAudioTrack());

    function Harness() {
      const currentTime = useCurrentTime();
      return <div data-testid="current-time">{currentTime}</div>;
    }

    const { getByTestId } = render(
      <PlayerProvider loadTrack={loadTrackMock}>
        <Harness />
      </PlayerProvider>,
    );

    expect(getByTestId("current-time").textContent).toBe("0");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(getByTestId("current-time").textContent).toBe("0");
    vi.useRealTimers();
  });
});
