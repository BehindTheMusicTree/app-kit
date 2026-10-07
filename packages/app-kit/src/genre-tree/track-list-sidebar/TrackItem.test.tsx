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
    artists: [
      { name: "Artist One", uuid: "artist-1" },
      { name: "Artist Two", uuid: "artist-2" },
    ],
    album: { name: "My Album", uuid: "album-1" },
    genre: { name: "Rock", uuid: "genre-1" },
    createdOn: "2024-01-01T00:00:00.000Z",
    playlists: [],
    playCount: 0,
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

  it("greys out an unplayable track, shows the reason, and offers no play control", () => {
    render(<TrackItem track={makeTrack({ youtubeUnplayableReason: "not_embeddable" })} position={3} />);

    expect(screen.getByText("Embedding disabled")).toBeInTheDocument();
    expect(screen.getByTitle("Embedding disabled")).toHaveClass("opacity-50");
    expect(screen.queryByRole("button", { name: "play-pause" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("3"));
    expect(loadTrackForPlayer).not.toHaveBeenCalled();
  });

  it("links to the MusicBrainz recording when the track has an MBID", () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <TrackItem track={makeTrack({ musicbrainzRecordingId: "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d" })} position={1} />
      </div>,
    );

    const link = screen.getByRole("link", { name: "View My Song on MusicBrainz" });
    expect(link).toHaveAttribute("href", "https://musicbrainz.org/recording/b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    fireEvent.click(link);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("renders no MusicBrainz link without an MBID", () => {
    render(<TrackItem track={makeTrack({ musicbrainzRecordingId: null })} position={1} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
