import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { render } from "../test-utils";
import { makeGenreUuid } from "@behindthemusictree/app-kit/genre-tree/testing";
import { GenreTreeView } from "./GenreTreeView";

const {
  useListFullGenrePlaylistsMock,
  useFetchGenreOverviewMock,
  prefetchGenreOverviewMock,
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

vi.mock("../../../app-kit/src/genre-tree/useSong", () => ({ useSong: () => ({ status: "idle" }) }));

vi.mock("../../../app-kit/src/genre-tree/useSongSearch", () => ({
  useSongSearch: () => ({ songs: [], isError: false, settled: false, pending: false }),
}));

vi.mock("./artist/ArtistSongs", () => ({ default: () => <p>Songs list</p> }));

vi.mock("../../../app-kit/src/genre-tree/useGenre", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useFetchGenreDetail: (id: string | null) => {
    const playlist = playlists.find((p) => p.criteria.uuid === id);
    return { data: playlist ? { uuid: id, name: playlist.name, root: playlist.criteria,
      parent: null, children: [], ascendants: [], criteriaPlaylist: playlist, tracksCount: 3,
    } : undefined, isPending: false, isError: !playlist };
  },
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
  { uuid: "pop", name: "Mainstream Pop", root: { uuid: "pop" }, parent: null, tracksCount: 3, criteria: { uuid: makeGenreUuid("pop-criteria"), name: "Mainstream Pop" } },
  { uuid: "rock", name: "Rock", root: { uuid: "rock" }, parent: null, tracksCount: 3, criteria: { uuid: makeGenreUuid("rock-criteria"), name: "Rock" } },
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
    const onSelectedGenreUuidChange = vi.fn();
    const props = { scope: "me" as const, viewMode: "wheel" as const, artistSearch: false as const, songSearch: false, handleGenreCreationAction: vi.fn(), handleGenreRenameAction: vi.fn(), getBackendBaseUrl: () => "", onSelectedGenreUuidChange };
    const view = render(<GenreTreeView {...props} selectedGenreUuid={null} />);
    const node = await screen.findByText("Mainstream Pop");
    fireEvent.click(node);
    expect(onSelectedGenreUuidChange).toHaveBeenCalledWith(makeGenreUuid("pop-criteria"));
    expect(screen.getByRole("combobox", { name: "Search a genre" })).toHaveValue("");
    expect(screen.queryByRole("complementary", { name: /.+/ })).not.toBeInTheDocument();
    view.rerender(<GenreTreeView {...props} selectedGenreUuid={makeGenreUuid("pop-criteria")} />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Search a genre" })).toHaveValue("Mainstream Pop"));
    await waitFor(() => expect(screen.queryByRole("complementary", { name: /.+/ })).toBeInTheDocument());
    view.rerender(<GenreTreeView {...props} selectedGenreUuid={null} />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Search a genre" })).toHaveValue(""));
    expect(screen.queryByRole("complementary", { name: /.+/ })).not.toBeInTheDocument();
  });
  it.each(["wheel", "pop-core"] as const)("restores mounted %s silently and accepts a later selection", async (viewMode) => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON() {} });
    const onViewportChange = vi.fn();
    const onSelectedGenreUuidChange = vi.fn();
    const props = { scope: "me" as const, viewMode, artistSearch: false as const, songSearch: false, handleGenreCreationAction: vi.fn(), handleGenreRenameAction: vi.fn(), getBackendBaseUrl: () => "", onSelectedGenreUuidChange, onViewportChange, focusGenreUuid: null, onFocusGenreChange: vi.fn() };
    const view = render(<GenreTreeView {...props} selectedGenreUuid={null} />);
    const viewport = view.container.querySelector(".gtv-wheel-container")!;
    const stage = viewport.querySelector<HTMLElement>(":scope > div[style*='transform']")!;
    const first = { viewport: { x: 30, y: 40, zoom: 2 }, revision: "back-1" };
    view.rerender(<GenreTreeView {...props} selectedGenreUuid={makeGenreUuid("pop-criteria")} viewportRestore={first} />);
    await waitFor(() => expect(stage.style.transform).toContain("scale(2)"));
    expect(view.container.querySelector(".gtv-wheel-container")).toBe(viewport);
    expect(screen.getByRole("combobox", { name: "Search a genre" })).toHaveValue("Mainstream Pop");
    const second = { viewport: { x: 50, y: 60, zoom: 3 }, revision: "back-2" };
    view.rerender(<GenreTreeView {...props} selectedGenreUuid={makeGenreUuid("pop-criteria")} viewportRestore={second} />);
    await waitFor(() => expect(stage.style.transform).toContain("scale(3)"));
    expect(onViewportChange).not.toHaveBeenCalled();
    fireEvent.click(view.container.querySelector("#group-rock")!);
    await waitFor(() => expect(onSelectedGenreUuidChange).toHaveBeenCalledWith(makeGenreUuid("rock-criteria")));
    view.rerender(<GenreTreeView {...props} selectedGenreUuid={makeGenreUuid("rock-criteria")} viewportRestore={second} />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Search a genre" })).toHaveValue("Rock"));
    expect(screen.queryByRole("complementary", { name: /.+/ })).toBeInTheDocument();
  });

});
