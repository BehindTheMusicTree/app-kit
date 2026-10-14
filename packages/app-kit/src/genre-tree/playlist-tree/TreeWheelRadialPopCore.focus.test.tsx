import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("../TrackListContext", () => ({
  useTrackList: () => ({ trackList: null, playNewTrackListFromGenrePlaylist: vi.fn() }),
}));

vi.mock("../useGenre", () => ({
  useUpdateGenre: () => ({ mutate: vi.fn() }),
}));

vi.mock("../../player/PlayerContext", () => ({
  usePlayer: () => ({ isPlaying: false, setIsPlaying: vi.fn() }),
}));

import GenrePlaylistTreeWheelRadialPopCore, {
  type GenrePlaylistTreeWheelRadialPopCoreProps,
} from "./TreeWheelRadialPopCore";
import type { TrackBase } from "../schemas/track/base";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe("GenrePlaylistTreeWheelRadialPopCore focus (real genre-tree-view)", () => {
  it("resets an unknown focusGenreUuid via onFocusGenreChange(null, rejected) without throwing", () => {
    const onFocusGenreChange = vi.fn();
    const genrePlaylists = [
      {
        uuid: "gp1",
        name: "Mainstream Pop",
        parent: null,
        root: { uuid: "gp1", name: "Mainstream Pop" },
        tracksCount: 3,
        criteria: { uuid: "c1", name: "Mainstream Pop" },
        createdOn: "2024-01-01T00:00:00.000Z",
        updatedOn: null,
        isUnacceptedRoot: false,
      },
    ] as GenrePlaylistTreeWheelRadialPopCoreProps<TrackBase>["genrePlaylists"];

    expect(() =>
      render(
        <GenrePlaylistTreeWheelRadialPopCore
          scope="me"
          genrePlaylists={genrePlaylists}
          reparentingGenreUuid={null}
          setReparentingGenreUuid={vi.fn()}
          handleGenreCreationAction={vi.fn()}
          handleGenreRenameAction={vi.fn()}
          getBackendBaseUrl={() => "https://backend.example.com"}
          focusGenreUuid="unknown-uuid"
          onFocusGenreChange={onFocusGenreChange}
        />,
      ),
    ).not.toThrow();

    expect(onFocusGenreChange).toHaveBeenCalledTimes(1);
    expect(onFocusGenreChange).toHaveBeenCalledWith(null, "rejected");
  });
});
