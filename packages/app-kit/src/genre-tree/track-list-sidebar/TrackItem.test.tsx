import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { usePlayerMock, useTrackListMock } = vi.hoisted(() => ({
  usePlayerMock: vi.fn(),
  useTrackListMock: vi.fn(),
}));

vi.mock("../../player/PlayerContext", () => ({ usePlayer: usePlayerMock }));
vi.mock("../TrackListContext", () => ({ useTrackList: useTrackListMock }));
vi.mock("../TrackPositionPlayPause", () => ({
  default: ({ handlePlayPauseClick }: { handlePlayPauseClick: (e: React.MouseEvent) => void }) => (
    <button onClick={handlePlayPauseClick as unknown as () => void}>play-pause</button>
  ),
}));

import TrackItem from "./TrackItem";

function makeTrack(overrides: Record<string, unknown> = {}) {
  return {
    uuid: "track-1",
    title: "My Song",
    artists: [{ name: "Artist One" }, { name: "Artist Two" }],
    album: { name: "My Album" },
    genre: { name: "Rock" },
    ...overrides,
  };
}

describe("TrackItem", () => {
  const handlePlayPauseAction = vi.fn();
  const toTrackAtPosition = vi.fn();
  const loadTrackForPlayer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerMock.mockReturnValue({
      handlePlayPauseAction,
      playerTrackObject: null,
      loadTrackForPlayer,
    });
    useTrackListMock.mockReturnValue({
      trackList: { origin: { scope: "reference" } },
      toTrackAtPosition,
    });
  });

  it("renders title, artists, album, and genre", () => {
    render(<TrackItem track={makeTrack()} position={1} />);

    expect(screen.getByText("My Song")).toBeInTheDocument();
    expect(screen.getByText("Artist One, Artist Two")).toBeInTheDocument();
    expect(screen.getByText("My Album")).toBeInTheDocument();
    expect(screen.getByText("Rock")).toBeInTheDocument();
  });

  it("renders empty strings when artists, album, and genre are missing", () => {
    render(<TrackItem track={makeTrack({ artists: null, album: null, genre: null })} position={1} />);

    expect(screen.queryByText("My Album")).not.toBeInTheDocument();
    expect(screen.queryByText("Rock")).not.toBeInTheDocument();
  });

  it("renders empty artists array as no artist line", () => {
    render(<TrackItem track={makeTrack({ artists: [] })} position={1} />);

    expect(screen.getByText("My Song")).toBeInTheDocument();
  });

  it("renders duration via renderDuration prop", () => {
    render(<TrackItem track={makeTrack()} position={1} renderDuration={() => "3:45"} />);

    expect(screen.getByText("3:45")).toBeInTheDocument();
  });

  it("renders nothing for duration when renderDuration is not provided", () => {
    const { container } = render(<TrackItem track={makeTrack()} position={1} />);

    expect(container.querySelector(".duration")?.textContent).toBe("");
  });

  it("renders actions via renderActions prop", () => {
    render(<TrackItem track={makeTrack()} position={1} renderActions={() => <span>Edit</span>} />);

    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("does not render actions container when renderActions is not provided", () => {
    const { container } = render(<TrackItem track={makeTrack()} position={1} />);

    expect(container.querySelector(".edit")).toBeNull();
  });

  it("calls handlePlayPauseAction when this track is already loaded", () => {
    usePlayerMock.mockReturnValue({
      handlePlayPauseAction,
      playerTrackObject: { track: { id: "track-1" } },
      loadTrackForPlayer,
    });

    render(<TrackItem track={makeTrack()} position={1} />);
    fireEvent.click(screen.getByText("play-pause"));

    expect(handlePlayPauseAction).toHaveBeenCalled();
    expect(toTrackAtPosition).not.toHaveBeenCalled();
    expect(loadTrackForPlayer).not.toHaveBeenCalled();
  });

  it("loads a new track when scope is set and it is not the current track", () => {
    render(<TrackItem track={makeTrack()} position={2} />);
    fireEvent.click(screen.getByText("play-pause"));

    expect(toTrackAtPosition).toHaveBeenCalledWith(2);
    expect(loadTrackForPlayer).toHaveBeenCalledWith("track-1");
    expect(handlePlayPauseAction).not.toHaveBeenCalled();
  });

  it("does nothing when scope is null and it is not the current track", () => {
    useTrackListMock.mockReturnValue({
      trackList: null,
      toTrackAtPosition,
    });

    render(<TrackItem track={makeTrack()} position={2} />);
    fireEvent.click(screen.getByText("play-pause"));

    expect(toTrackAtPosition).not.toHaveBeenCalled();
    expect(loadTrackForPlayer).not.toHaveBeenCalled();
    expect(handlePlayPauseAction).not.toHaveBeenCalled();
  });
});
