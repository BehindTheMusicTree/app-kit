import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { usePlayerMock } = vi.hoisted(() => ({ usePlayerMock: vi.fn() }));

vi.mock("@behindthemusictree/app-kit/player", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePlayer: usePlayerMock,
}));

import TrackPositionPlayPause from "./TrackPositionPlayPause";
import { PlayStates } from "@behindthemusictree/app-kit/player";

describe("TrackPositionPlayPause", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the position number when not the current track", () => {
    usePlayerMock.mockReturnValue({ playerTrackObject: null, playState: PlayStates.STOPPED });

    render(<TrackPositionPlayPause position={3} uuid="track-1" handlePlayPauseClick={vi.fn()} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders animated bars when it is the current track and playing", () => {
    usePlayerMock.mockReturnValue({
      playerTrackObject: { track: { id: "track-1" } },
      playState: PlayStates.PLAYING,
    });

    const { container } = render(
      <TrackPositionPlayPause position={3} uuid="track-1" handlePlayPauseClick={vi.fn()} />,
    );

    expect(container.querySelectorAll(".track-position-play-pause__bar")).toHaveLength(3);
    expect(container.querySelector(".track-position-play-pause__bars")).toHaveAttribute("data-playing", "true");
  });

  it("renders static bars when the current track is paused", () => {
    usePlayerMock.mockReturnValue({
      playerTrackObject: { track: { id: "track-1" } },
      playState: PlayStates.PAUSED,
    });

    const { container } = render(
      <TrackPositionPlayPause position={3} uuid="track-1" handlePlayPauseClick={vi.fn()} />,
    );

    expect(container.querySelectorAll(".track-position-play-pause__bar")).toHaveLength(3);
    expect(container.querySelector(".track-position-play-pause__bars")).toHaveAttribute("data-playing", "false");
  });

  it("hides playing bars on hover and reveals only the pause action", () => {
    usePlayerMock.mockReturnValue({
      playerTrackObject: { track: { id: "track-1" } },
      playState: PlayStates.PLAYING,
    });

    const { container } = render(
      <TrackPositionPlayPause position={3} uuid="track-1" handlePlayPauseClick={vi.fn()} />,
    );
    const status = container.querySelector(".track-position-play-pause__status");
    const pauseAction = container.querySelector(".group-hover\\:flex");

    expect(status).toHaveClass("group-hover:hidden");
    expect(status?.querySelector(".track-position-play-pause__bars")).toHaveAttribute("data-playing", "true");
    expect(pauseAction).toBeInTheDocument();
  });

  it("shows the track number instead of bars for a different current track", () => {
    usePlayerMock.mockReturnValue({
      playerTrackObject: { track: { id: "another-track" } },
      playState: PlayStates.PLAYING,
    });

    const { container } = render(
      <TrackPositionPlayPause position={3} uuid="track-1" handlePlayPauseClick={vi.fn()} />,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(container.querySelector(".track-position-play-pause__bars")).toBeNull();
  });

  it("renders without throwing when loading", () => {
    usePlayerMock.mockReturnValue({
      playerTrackObject: { track: { id: "track-1" } },
      playState: PlayStates.LOADING,
    });

    expect(() =>
      render(<TrackPositionPlayPause position={3} uuid="track-1" handlePlayPauseClick={vi.fn()} />),
    ).not.toThrow();
  });

  it("renders position when current track is stopped", () => {
    usePlayerMock.mockReturnValue({
      playerTrackObject: { track: { id: "track-1" } },
      playState: PlayStates.STOPPED,
    });

    render(<TrackPositionPlayPause position={5} uuid="track-1" handlePlayPauseClick={vi.fn()} />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls handlePlayPauseClick when clicked", () => {
    const handlePlayPauseClick = vi.fn();
    usePlayerMock.mockReturnValue({ playerTrackObject: null, playState: PlayStates.STOPPED });

    render(<TrackPositionPlayPause position={1} uuid="track-1" handlePlayPauseClick={handlePlayPauseClick} />);
    fireEvent.click(screen.getByText("1"));

    expect(handlePlayPauseClick).toHaveBeenCalled();
  });
});
