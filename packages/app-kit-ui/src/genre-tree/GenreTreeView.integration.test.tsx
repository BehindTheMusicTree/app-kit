import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, fireEvent, act, cleanup, waitFor } from "@testing-library/react";
import { render } from "../test-utils";
import { z } from "zod";
import { GenreTreeView } from "./GenreTreeView";

const {
  useListFullGenrePlaylistsMock,
  useFetchGenreOverviewMock,
  prefetchGenreOverviewMock,
  treePerRootPropsMock,
  treeWheelPropsMock,
  treeWheelRadialPopCorePropsMock,
  setIsPlayingMock,
  trackListState,
  playNewTrackListFromGenrePlaylistMock,
  showPopupMock,
  hidePopupMock,
  useArtistSearchMock,
  useArtistMock,
  useArtistGenreCountsMock,
  playNewTrackListFromArtistMock,
  updateGenreMock,
} = vi.hoisted(() => ({
  useListFullGenrePlaylistsMock: vi.fn(),
  useFetchGenreOverviewMock: vi.fn(),
  prefetchGenreOverviewMock: vi.fn(),
  treePerRootPropsMock: vi.fn(),
  treeWheelPropsMock: vi.fn(),
  treeWheelRadialPopCorePropsMock: vi.fn(),
  setIsPlayingMock: vi.fn(),
  trackListState: { value: null as unknown },
  playNewTrackListFromGenrePlaylistMock: vi.fn(() => Promise.resolve()),
  showPopupMock: vi.fn(),
  hidePopupMock: vi.fn(),
  useArtistSearchMock: vi.fn(),
  useArtistMock: vi.fn(),
  useArtistGenreCountsMock: vi.fn(),
  playNewTrackListFromArtistMock: vi.fn(() => Promise.resolve()),
  updateGenreMock: vi.fn(),
}));

vi.mock("@behindthemusictree/app-kit/popup", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePopup: () => ({ showPopup: showPopupMock, hidePopup: hidePopupMock, activePopup: null }),
}));

vi.mock("../../../app-kit/src/player/PlayerContext", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePlayer: () => ({ isPlaying: false, setIsPlaying: setIsPlayingMock }),
}));

vi.mock("../../../app-kit/src/genre-tree/TrackListContext", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTrackList: () => ({
    trackList: trackListState.value,
    playNewTrackListFromGenrePlaylist: playNewTrackListFromGenrePlaylistMock,
    playNewTrackListFromArtist: playNewTrackListFromArtistMock,
  }),
}));

// useGenreTreeViewState and GenreDetailExtras reach these hooks through app-kit's internal modules,
// so mocking the package barrel would not intercept them.
vi.mock("../../../app-kit/src/genre-tree/useGenrePlaylist", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useListFullGenrePlaylists: () => useListFullGenrePlaylistsMock(),
}));

vi.mock("../../../app-kit/src/genre-tree/useArtistSearch", () => ({
  useArtistSearch: (getBaseUrl: () => string, text: string) => useArtistSearchMock(getBaseUrl, text),
}));

vi.mock("../../../app-kit/src/genre-tree/useArtistGenreCounts", () => ({
  useArtistGenreCounts: (uuid: string | null) => useArtistGenreCountsMock(uuid),
}));

vi.mock("../../../app-kit/src/genre-tree/useArtist", () => ({
  useArtist: (uuid: string | null, getBaseUrl: () => string) => useArtistMock(uuid, getBaseUrl),
}));

vi.mock("./artist/ArtistSongs", () => ({ default: () => <p>Songs list</p> }));

vi.mock("../../../app-kit/src/genre-tree/useGenre", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useFetchGenreOverview: (id: string | null) => useFetchGenreOverviewMock(id),
  usePrefetchGenreOverview: () => prefetchGenreOverviewMock,
  useUpdateGenre: () => ({ mutate: updateGenreMock }),
}));

vi.mock("./GenrePlaylistTracks", () => ({
  GenrePlaylistTracks: ({ genrePlaylist }: { genrePlaylist: { name: string } }) => (
    <div data-testid="genre-playlist-tracks">{genrePlaylist.name}</div>
  ),
}));


vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const playlists = [
  { uuid: "pop", name: "Mainstream Pop", root: { uuid: "pop" }, parent: null, tracksCount: 3, criteria: { uuid: "pop-criteria", name: "Mainstream Pop" } },
  { uuid: "rock", name: "Rock", root: { uuid: "rock" }, parent: null, tracksCount: 3, criteria: { uuid: "rock-criteria", name: "Rock" } },
];

describe("GenreTreeView with the real renderer", () => {
  beforeEach(() => {
    useListFullGenrePlaylistsMock.mockReturnValue({ data: playlists, isPending: false });
    useFetchGenreOverviewMock.mockReturnValue({ data: undefined, isPending: false });
    useArtistSearchMock.mockReturnValue({ artists: [], isError: false, settled: false, pending: false });
    useArtistMock.mockReturnValue({ status: "idle" });
    useArtistGenreCountsMock.mockReturnValue({ data: undefined, isPending: false, isError: false });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("keeps the controlled selection and search in agreement", async () => {
    const onSelectedNodeIdChange = vi.fn();
    const props = { scope: "me" as const, viewMode: "wheel" as const, artistSearch: false as const, handleGenreCreationAction: vi.fn(), handleGenreRenameAction: vi.fn(), getBackendBaseUrl: () => "", onSelectedNodeIdChange };
    const view = render(<GenreTreeView {...props} selectedNodeId={null} />);
    const node = await screen.findByText("Mainstream Pop");
    fireEvent.click(node);
    expect(onSelectedNodeIdChange).toHaveBeenCalledWith("pop");
    expect(screen.getByRole("textbox", { name: "Search a genre" })).toHaveValue("");
    expect(view.container.querySelector(".gtv-info-panel")).toBeNull();
    view.rerender(<GenreTreeView {...props} selectedNodeId="pop" />);
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Search a genre" })).toHaveValue("Mainstream Pop"));
    await waitFor(() => expect(view.container.querySelector(".gtv-info-panel")).not.toBeNull());
    view.rerender(<GenreTreeView {...props} selectedNodeId={null} />);
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Search a genre" })).toHaveValue(""));
    expect(view.container.querySelector(".gtv-info-panel")).toBeNull();
  });
});
