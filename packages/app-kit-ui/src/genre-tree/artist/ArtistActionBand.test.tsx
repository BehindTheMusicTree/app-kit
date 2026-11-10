import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TrackListOriginType } from "@behindthemusictree/app-kit/genre-tree";
import ArtistActionBand from "./ArtistActionBand";

const { playMock, setIsPlayingMock, state } = vi.hoisted(() => ({
  playMock: vi.fn(() => Promise.resolve()),
  setIsPlayingMock: vi.fn(),
  state: { trackList: null as unknown, isPlaying: false },
}));

vi.mock("../../../../app-kit/src/genre-tree/TrackListContext", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTrackList: () => ({ trackList: state.trackList, playNewTrackListFromArtist: playMock }),
}));
vi.mock("../../../../app-kit/src/player/PlayerContext", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePlayer: () => ({ isPlaying: state.isPlaying, setIsPlaying: setIsPlayingMock }),
}));

const artist = { uuid: "a1", name: "Band", playableTracksCount: 7 };

describe("ArtistActionBand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.trackList = null;
    state.isPlaying = false;
  });

  it("plays the artist's songs and shows their count", () => {
    render(<ArtistActionBand artist={artist} />);
    fireEvent.click(screen.getByRole("button", { name: /^Play7/ }));
    expect(playMock).toHaveBeenCalledWith({ uuid: "a1", name: "Band" }, "reference", { ordering: "title" });
  });

  it("disables Play when the artist has no playable song", () => {
    render(<ArtistActionBand artist={{ ...artist, playableTracksCount: 0 }} />);
    expect(screen.getByRole("button", { name: /^Play0/ })).toBeDisabled();
  });

  it("pauses instead of reloading when the artist is already playing", () => {
    state.trackList = { origin: { type: TrackListOriginType.ARTIST, uuid: "a1" } };
    state.isPlaying = true;
    render(<ArtistActionBand artist={artist} />);
    fireEvent.click(screen.getByRole("button", { name: /^Pause/ }));
    expect(setIsPlayingMock).toHaveBeenCalledWith(false);
    expect(playMock).not.toHaveBeenCalled();
  });
});
