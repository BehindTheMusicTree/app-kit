import { describe, it, expect, vi } from "vitest";
import { AudioMediaController, YoutubeMediaController } from "./MediaController";

describe("AudioMediaController", () => {
  function makeAudio(overrides: Partial<HTMLAudioElement> = {}) {
    return {
      currentTime: 0,
      volume: 0.5,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      ...overrides,
    } as unknown as HTMLAudioElement;
  }

  it("gets and sets current time", () => {
    const audio = makeAudio({ currentTime: 42 });
    const controller = new AudioMediaController(audio);

    expect(controller.getCurrentTime()).toBe(42);
    controller.setCurrentTime(10);
    expect(audio.currentTime).toBe(10);
  });

  it("gets and sets volume on a 0-100 scale", () => {
    const audio = makeAudio({ volume: 0.5 });
    const controller = new AudioMediaController(audio);

    expect(controller.getVolume()).toBe(50);
    controller.setVolume(80);
    expect(audio.volume).toBe(0.8);
  });

  it("play() calls audio.play and swallows rejections", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const play = vi.fn().mockRejectedValue(new Error("nope"));
    const audio = makeAudio({ play });
    const controller = new AudioMediaController(audio);

    controller.play();
    await Promise.resolve();
    await Promise.resolve();

    expect(play).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error playing audio:", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("pause() calls audio.pause", () => {
    const audio = makeAudio();
    const controller = new AudioMediaController(audio);

    controller.pause();

    expect(audio.pause).toHaveBeenCalled();
  });
});

describe("YoutubeMediaController", () => {
  function makePlayer(overrides: Partial<YT.Player> = {}) {
    return {
      getCurrentTime: vi.fn().mockReturnValue(12),
      seekTo: vi.fn(),
      getVolume: vi.fn().mockReturnValue(60),
      setVolume: vi.fn(),
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      ...overrides,
    } as unknown as YT.Player;
  }

  it("gets current time from the player", () => {
    const player = makePlayer();
    const controller = new YoutubeMediaController(player);

    expect(controller.getCurrentTime()).toBe(12);
  });

  it("sets current time via seekTo", () => {
    const player = makePlayer();
    const controller = new YoutubeMediaController(player);

    controller.setCurrentTime(20);

    expect(player.seekTo).toHaveBeenCalledWith(20, true);
  });

  it("gets volume from the player", () => {
    const player = makePlayer();
    const controller = new YoutubeMediaController(player);

    expect(controller.getVolume()).toBe(60);
  });

  it("sets volume on the player", () => {
    const player = makePlayer();
    const controller = new YoutubeMediaController(player);

    controller.setVolume(30);

    expect(player.setVolume).toHaveBeenCalledWith(30);
  });

  it("play() calls playVideo", () => {
    const player = makePlayer();
    const controller = new YoutubeMediaController(player);

    controller.play();

    expect(player.playVideo).toHaveBeenCalled();
  });

  it("pause() calls pauseVideo", () => {
    const player = makePlayer();
    const controller = new YoutubeMediaController(player);

    controller.pause();

    expect(player.pauseVideo).toHaveBeenCalled();
  });
});
