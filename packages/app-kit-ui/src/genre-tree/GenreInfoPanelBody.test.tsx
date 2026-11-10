import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GenreCatalogueCountsSchema, GenrePlaylistSummarySchema } from "@behindthemusictree/app-kit/genre-tree";
import { makeGenreUuid } from "@behindthemusictree/app-kit/genre-tree/testing";
import { render } from "../test-utils";
import { GenreInfoPanelBody } from "./GenreInfoPanelBody";

vi.mock("@behindthemusictree/app-kit/player", () => ({
  usePlayer: () => ({ isPlaying: false, setIsPlaying: vi.fn() }),
}));
vi.mock("./GenreDetailExtras", () => ({ GenreDetailExtras: () => null }));

const counts = (direct: number, canonical: number) => ({
  genreOnlyTracksCount: direct,
  genreAndSubgenresTracksCount: { canonical, regional: direct, all: canonical },
});

function renderPanel(playlistCount: number) {
  const playlist = GenrePlaylistSummarySchema.parse({
    uuid: "3f0d7b1e-8a3c-4d57-9a53-2b7f4f9c0a11",
    name: "Detroit Techno",
    ...counts(0, playlistCount),
  });
  const play = vi.fn().mockResolvedValue(undefined);
  render(<GenreInfoPanelBody
    family={null}
    genreUuid={makeGenreUuid("genre")}
    genrePlaylist={playlist}
    catalogue={GenreCatalogueCountsSchema.parse(counts(10, 200))}
    scope="reference"
    getBackendBaseUrl={() => "https://backend.example.com"}
    playback={{ playing: null, play }}
    band={{ node: { id: playlist.uuid, name: playlist.name, parentId: null, itemCount: playlistCount } }}
  />);
  return { play, playlist };
}

describe("GenreInfoPanelBody music populations", () => {
  it("offers a Play button per scope with its playable count, in order", () => {
    renderPanel(139);
    const names = screen.getAllByRole("button").map((button) => button.textContent);
    expect(names).toEqual(["Direct0", "Canonical139", "Canonical + regional139", "Regional0"]);
  });

  it("plays the clicked scope", () => {
    const { play, playlist } = renderPanel(139);
    fireEvent.click(screen.getByRole("button", { name: /^Canonical \+ regional/ }));
    expect(play).toHaveBeenCalledWith(playlist, { coverage: "genreAndSubgenres", subgenres: "all" });
    fireEvent.click(screen.getByRole("button", { name: /^Canonical139/ }));
    expect(play).toHaveBeenLastCalledWith(playlist, { coverage: "genreAndSubgenres", subgenres: "canonical" });
  });

  it("keeps an empty scope visible but disabled", () => {
    renderPanel(139);
    expect(screen.getByRole("button", { name: /^Direct/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Regional/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Canonical139/ })).toBeEnabled();
  });

  it("disables every Play button for an empty playlist even when the catalogue has songs", () => {
    renderPanel(0);
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });
});
