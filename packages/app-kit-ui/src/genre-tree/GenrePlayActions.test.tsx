import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import GenrePlayActions from "./GenrePlayActions";
import type { PlayableGenrePlaylist } from "./GenreInfoPanelBody";
import type { GenrePlaylistPlayback } from "./playlist-tree/useGenrePlaylistPlayback";

const { setIsPlayingMock, state } = vi.hoisted(() => ({
  setIsPlayingMock: vi.fn(),
  state: { isPlaying: false },
}));

vi.mock("../../../app-kit/src/player/PlayerContext", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePlayer: () => ({ isPlaying: state.isPlaying, setIsPlaying: setIsPlayingMock }),
}));

const canonical = {
  uuid: "g1",
  tracksCount: 10,
  genreOnlyTracksCount: 1,
  genreAndSubgenresTracksCount: { all: 10, canonical: 6, regional: 4 },
} as unknown as PlayableGenrePlaylist;

const regional = {
  uuid: "g2",
  tracksCount: 5,
  genreOnlyTracksCount: 0,
  genreAndSubgenresTracksCount: { all: 5 },
} as unknown as PlayableGenrePlaylist;

function makePlayback(playing: GenrePlaylistPlayback["playing"] = null) {
  return { playing, play: vi.fn(() => Promise.resolve()) } satisfies GenrePlaylistPlayback;
}

describe("GenrePlayActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.isPlaying = false;
  });

  it("offers four scoped buttons with their counts for a canonical genre", () => {
    render(<GenrePlayActions genrePlaylist={canonical} playback={makePlayback()} />);

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Genre1",
      "Canonical6",
      "Regional4",
      "All10",
    ]);
  });

  it("offers Genre and All for a regional genre and disables an empty scope", () => {
    render(<GenrePlayActions genrePlaylist={regional} playback={makePlayback()} />);

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Genre/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /All/ })).toBeEnabled();
  });

  it("plays the chosen scope", () => {
    const playback = makePlayback();
    render(<GenrePlayActions genrePlaylist={canonical} playback={playback} />);

    fireEvent.click(screen.getByRole("button", { name: /^Regional/ }));

    expect(playback.play).toHaveBeenCalledWith(canonical, { coverage: "genreAndSubgenres", subgenres: "regional" });
  });

  it("turns the current scope into Pause and toggles playback", () => {
    state.isPlaying = true;
    const playback = makePlayback({ uuid: "g1", selectionKey: "genreAndSubgenres,canonical" });
    render(<GenrePlayActions genrePlaylist={canonical} playback={playback} />);

    fireEvent.click(screen.getByRole("button", { name: /Pause/ }));

    expect(setIsPlayingMock).toHaveBeenCalledWith(false);
    expect(playback.play).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^Regional/ })).toBeEnabled();
  });
});
