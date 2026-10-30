import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { render } from "../test-utils";
import { PlayStates } from "@behindthemusictree/app-kit/player";

const { usePlayerMock, useTrackListMock, useCurrentTimeMock } = vi.hoisted(() => ({
  usePlayerMock: vi.fn(),
  useTrackListMock: vi.fn(),
  useCurrentTimeMock: vi.fn(),
}));

vi.mock("@behindthemusictree/app-kit/player", () => ({
  usePlayer: usePlayerMock,
  useCurrentTime: useCurrentTimeMock,
  PlayStates: { PLAYING: "PLAYING", PAUSED: "PAUSED", STOPPED: "STOPPED", LOADING: "LOADING" },
}));

vi.mock("@behindthemusictree/app-kit/genre-tree", () => ({
  useTrackList: useTrackListMock,
  formatTime: (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`,
}));

import PlayerControls from "./PlayerControls";

const handlePlayPauseAction = vi.fn();
const playNextTrack = vi.fn();
const playPreviousTrack = vi.fn();
const seekTo = vi.fn();
const setVolume = vi.fn();

function setup({ ready = true, playState = PlayStates.PAUSED } = {}) {
  usePlayerMock.mockReturnValue({
    duration: 120,
    handlePlayPauseAction,
    isLoading: false,
    playState,
    playerTrackObject: ready ? { isReady: true } : null,
    seekTo,
    setVolume,
    volume: 50,
  });
  useTrackListMock.mockReturnValue({
    hasNextTrack: true,
    hasPreviousTrack: true,
    playNextTrack,
    playPreviousTrack,
  });
  useCurrentTimeMock.mockReturnValue(45);
}

describe("PlayerControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows playback time and calls the shared player and track-list actions", () => {
    setup();
    render(<PlayerControls />);

    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("0:45");
    expect(screen.getByLabelText("Duration")).toHaveTextContent("2:00");
    fireEvent.click(screen.getByRole("button", { name: "Previous track" }));
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Next track" }));
    fireEvent.change(screen.getByRole("slider", { name: "Seek" }), { target: { value: "75" } });
    fireEvent.change(screen.getByRole("slider", { name: "Volume" }), { target: { value: "80" } });

    expect(playPreviousTrack).toHaveBeenCalledOnce();
    expect(handlePlayPauseAction).toHaveBeenCalledOnce();
    expect(playNextTrack).toHaveBeenCalledOnce();
    expect(seekTo).toHaveBeenCalledWith(75);
    expect(setVolume).toHaveBeenCalledWith(80);
  });

  it("disables controls until the current track is ready", () => {
    setup({ ready: false });
    render(<PlayerControls />);

    expect(screen.getByRole("button", { name: "Previous track" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next track" })).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Seek" })).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Volume" })).toBeDisabled();
  });
});
