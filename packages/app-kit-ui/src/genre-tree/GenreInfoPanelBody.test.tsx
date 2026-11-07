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
    playback={{ playingNodeId: null, play }}
    band={{ node: { id: playlist.uuid, name: playlist.name, parentId: null, itemCount: playlistCount } }}
  />);
  return { play, playlist };
}

describe("GenreInfoPanelBody music populations", () => {
  it("plays a playlist with no direct songs and 139 songs with subgenres", () => {
    const { play, playlist } = renderPanel(139);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(play).toHaveBeenCalledWith(playlist);
    expect(screen.getByText(/Catalogue tracks: 10 this genre only/)).toHaveTextContent("200 with canonical subgenres");
    expect(screen.getByText(/Playlist tracks: 0 this genre only/)).toHaveTextContent("139 with canonical subgenres");
  });

  it("does not offer Play for an empty playlist even when the catalogue has songs", () => {
    renderPanel(0);
    expect(screen.queryByRole("button", { name: "Play" })).not.toBeInTheDocument();
  });
});
