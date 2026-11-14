import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Profiler, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "@behindthemusictree/app-kit/auth";
import { ConnectivityErrorProvider } from "@behindthemusictree/app-kit/transport";
import type { CriteriaOverview } from "@behindthemusictree/app-kit/genre-tree";
import { TrackNounProvider } from "@behindthemusictree/app-kit/track-noun";
import { screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { render as renderWithDefaults } from "../test-utils";
import { makeGenreUuid, makeGenrePlaylistUuid } from "@behindthemusictree/app-kit/genre-tree/testing";
import { GenreTreeView } from "./GenreTreeView";

const {
  treeCommit,
  useListFullGenrePlaylistsMock,
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
  treeCommit: vi.fn(),
  useListFullGenrePlaylistsMock: vi.fn(),
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
    if (!playlist) return { status: "not-found" };
    return { status: "success", genre: { uuid: id, name: playlist.name, root: playlist.criteria,
      parent: null, children: [], ascendants: [],
      catalogue: counts,
      criteriaPlaylist: { ...playlist, uuid: makeGenrePlaylistUuid(playlist.uuid) }, tracksCount: 3,
    } };
  },
  useUpdateGenre: () => ({ mutate: updateGenreMock }),
}));

vi.mock("./playlist-tree/TreeWheel", async (importOriginal) => {
  const { default: TreeWheel } = await importOriginal<typeof import("./playlist-tree/TreeWheel")>();
  return {
    default: (props: ComponentProps<typeof TreeWheel>) => (
      <Profiler id="tree" onRender={treeCommit}><TreeWheel {...props} /></Profiler>
    ),
  };
});

vi.mock("./GenrePlaylistTracks", () => ({
  GenrePlaylistTracks: ({ genrePlaylist }: { genrePlaylist: { name: string } }) => (
    <div data-testid="genre-playlist-tracks">{genrePlaylist.name}</div>
  ),
}));


const counts = { genreOnlyTracksCount: 3, genreAndSubgenresTracksCount: { canonical: 3, regional: 3, all: 3 } };

const playlists = [
  { uuid: "pop", name: "Mainstream Pop", root: { uuid: "pop" }, parent: null, tracksCount: 3, ...counts, criteria: { uuid: makeGenreUuid("pop-criteria"), name: "Mainstream Pop" } },
  { uuid: "rock", name: "Rock", root: { uuid: "rock" }, parent: null, tracksCount: 3, ...counts, criteria: { uuid: makeGenreUuid("rock-criteria"), name: "Rock" } },
];

const getBackendBaseUrl = () => "https://backend.test";
let queryClient: QueryClient;
let overviewResponses: Map<string, Promise<Response>>;
let fetchMock: ReturnType<typeof vi.fn>;

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ConnectivityErrorProvider>
          <TrackNounProvider singular="track" plural="tracks">{children}</TrackNounProvider>
        </ConnectivityErrorProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

function render(ui: ReactElement) {
  return renderWithDefaults(ui, { wrapper: Providers });
}

function deferredOverview(id: string) {
  let resolve!: (overview: CriteriaOverview) => void;
  const response = new Promise<Response>((done) => {
    resolve = (overview) => done(Response.json(overview));
  });
  overviewResponses.set(id, response);
  return resolve;
}

function overview(id: string, withImage = true): CriteriaOverview {
  const name = playlists.find((p) => p.criteria.uuid === id)!.name;
  return {
    uuid: makeGenreUuid(id), name, summary: `About ${name}`, description: null, summarySourceUrl: null,
    image: withImage ? {
      url: `https://images.test/${id}.jpg`, pageUrl: `https://commons.test/${id}`,
      author: `${name} photographer`, license: "CC BY 4.0", licenseUrl: "https://license.test/by/4.0",
    } : null,
  };
}

const coverProps = {
  scope: "reference" as const, viewMode: "wheel" as const, artistSearch: false as const, songSearch: false,
  handleGenreCreationAction: vi.fn(), handleGenreRenameAction: vi.fn(), getBackendBaseUrl,
};

describe("GenreTreeView with the real renderer", () => {
  beforeEach(() => {
    useListFullGenrePlaylistsMock.mockReturnValue({ data: playlists, isPending: false });
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    overviewResponses = new Map();
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    localStorage.setItem("session", JSON.stringify({ accessToken: "test-token", refreshToken: null, expiresAt: null }));
    fetchMock = vi.fn((input: string) => {
      const match = new URL(input).pathname.match(/^\/(?:me\/)?genres\/([^/]+)\/overview\/$/);
      if (!match) throw new Error(`Unexpected request: ${input}`);
      return overviewResponses.get(match[1]) ?? Promise.resolve(Response.json(overview(match[1], false)));
    });
    vi.stubGlobal("fetch", fetchMock);
    useArtistSearchMock.mockReturnValue({ artists: [], isError: false, settled: false, pending: false });
    useArtistMock.mockReturnValue({ status: "idle" });
    useArtistGenreCountsMock.mockReturnValue({ data: undefined, isPending: false, isError: false });
  });
  afterEach(() => { cleanup(); queryClient.clear(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("keeps the controlled selection and search in agreement", async () => {
    const onSelectedGenreUuidChange = vi.fn();
    const props = { scope: "me" as const, viewMode: "wheel" as const, artistSearch: false as const, songSearch: false, handleGenreCreationAction: vi.fn(), handleGenreRenameAction: vi.fn(), getBackendBaseUrl, onSelectedGenreUuidChange };
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
    const props = { scope: "me" as const, viewMode, artistSearch: false as const, songSearch: false, handleGenreCreationAction: vi.fn(), handleGenreRenameAction: vi.fn(), getBackendBaseUrl, onSelectedGenreUuidChange, onViewportChange, focusGenreUuid: null, onFocusGenreChange: vi.fn() };
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

  it("shares one deferred overview between cover and body, and clears both on refetch without committing the tree", async () => {
    const id = playlists[0].criteria.uuid;
    const resolve = deferredOverview(id);
    const view = render(<GenreTreeView {...coverProps} selectedGenreUuid={id} />);
    await screen.findByTestId("genre-detail-extras-skeleton");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(view.container.querySelector("[data-panel-cover]")).toBeNull();
    // The initial two-frame reveal commits independently of overview data.
    await waitFor(() => expect(view.container.querySelector(".gtv-wheel-container")?.closest("[aria-hidden]")).toHaveAttribute("aria-hidden", "false"));
    const commits = treeCommit.mock.calls.length;

    await act(async () => { resolve(overview(id)); });
    await screen.findByText("About Mainstream Pop");
    expect(screen.getByRole("img", { name: "Mainstream Pop" })).toHaveAttribute("src", overview(id).image!.url);
    expect(screen.getByRole("link", { name: "Mainstream Pop photographer" })).toHaveAttribute("href", overview(id).image!.pageUrl);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(treeCommit).toHaveBeenCalledTimes(commits);

    overviewResponses.set(id, Promise.resolve(Response.json(overview(id, false))));
    await act(async () => { await queryClient.invalidateQueries({ queryKey: ["referenceGenres", "overview", id] }); });
    await waitFor(() => expect(view.container.querySelector("[data-panel-cover]")).toBeNull());
    expect(screen.queryByRole("link", { name: "Mainstream Pop photographer" })).not.toBeInTheDocument();
    expect(screen.getByText("About Mainstream Pop")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(treeCommit).toHaveBeenCalledTimes(commits);
  });

  it("ignores a late previous selection and clears a cached cover on a no-image selection", async () => {
    const pop = playlists[0].criteria.uuid;
    const rock = playlists[1].criteria.uuid;
    const resolvePop = deferredOverview(pop);
    const resolveRock = deferredOverview(rock);
    const view = render(<GenreTreeView {...coverProps} selectedGenreUuid={pop} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    view.rerender(<GenreTreeView {...coverProps} selectedGenreUuid={rock} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await act(async () => { resolveRock(overview(rock, false)); });
    await screen.findByText("About Rock");
    await act(async () => { resolvePop(overview(pop)); });
    await waitFor(() => expect(queryClient.getQueryData(["referenceGenres", "overview", pop])).toEqual(overview(pop)));
    expect(view.container.querySelector("[data-panel-cover]")).toBeNull();
    expect(screen.queryByText("About Mainstream Pop")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mainstream Pop photographer" })).not.toBeInTheDocument();

    view.rerender(<GenreTreeView {...coverProps} selectedGenreUuid={pop} />);
    await screen.findByRole("img", { name: "Mainstream Pop" });
    expect(screen.getByRole("link", { name: "Mainstream Pop photographer" })).toBeInTheDocument();
    view.rerender(<GenreTreeView {...coverProps} selectedGenreUuid={rock} />);
    await screen.findByText("About Rock");
    expect(view.container.querySelector("[data-panel-cover]")).toBeNull();
    expect(screen.queryByRole("link", { name: "Mainstream Pop photographer" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

});
