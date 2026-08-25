import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { usePlayerMock } = vi.hoisted(() => ({ usePlayerMock: vi.fn() }));

vi.mock("../player/PlayerContext", () => ({ usePlayer: usePlayerMock }));

import TrackPositionPlayPause from "./TrackPositionPlayPause";
import { PlayStates } from "../player/PlayStates";

describe("TrackPositionPlayPause", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the position number when not the current track", () => {
    usePlayerMock.mockReturnValue({ playerTrackObject: null, playState: PlayStates.STOPPED });

    render(<TrackPositionPlayPause position={3} uuid="track-1" handlePlayPauseClick={vi.fn()} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders playing bars when it is the current track and playing", () => {
    usePlayerMock.mockReturnValue({
      playerTrackObject: { track: { id: "track-1" } },
      playState: PlayStates.PLAYING,
    });

    const { container } = render(
      <TrackPositionPlayPause position={3} uuid="track-1" handlePlayPauseClick={vi.fn()} />,
    );

    expect(container.querySelectorAll(".animate-scale-pulse").length).toBeGreaterThan(0);
  });

  it("renders bars without the pulse animation when paused", () => {
    usePlayerMock.mockReturnValue({
      playerTrackObject: { track: { id: "track-1" } },
      playState: PlayStates.PAUSED,
    });

    const { container } = render(
      <TrackPositionPlayPause position={3} uuid="track-1" handlePlayPauseClick={vi.fn()} />,
    );

    expect(container.querySelectorAll(".animate-scale-pulse").length).toBe(0);
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
