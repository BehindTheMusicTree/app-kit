import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, fireEvent, act, cleanup, waitFor } from "@testing-library/react";
import { render } from "../test-utils";
import { z } from "zod";
import ChangeParentPopup from "./ChangeParentPopup";

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

vi.mock("./playlist-tree/TreePerRoot", () => ({
  default: (props: unknown) => {
    treePerRootPropsMock(props);
    return <div data-testid="tree-per-root" />;
  },
}));

vi.mock("./playlist-tree/TreeWheel", () => ({
  default: (props: unknown) => {
    treeWheelPropsMock(props);
    return <div data-testid="tree-wheel" />;
  },
}));

vi.mock("./playlist-tree/TreeWheelRadialPopCore", () => ({
  default: (props: unknown) => {
    treeWheelRadialPopCorePropsMock(props);
    return <div data-testid="tree-wheel-radial-pop-core" />;
  },
}));

vi.mock("@behindthemusictree/genre-tree-view", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  GenreTreeWheelSkeleton: () => <div data-testid="genre-tree-wheel-skeleton" />,
  // Mirrors the real GenreTreeViewSkeleton's viewMode -> shape delegation, since mocking the
  // barrel doesn't affect genre-tree-view's own internal GenreTreeViewSkeleton -> GenreTreeWheelSkeleton import.
  GenreTreeViewSkeleton: ({ viewMode }: { viewMode: string }) =>
    viewMode === "wheel" || viewMode === "pop-core" ? (
      <div className="tree-container flex-1 min-h-0 w-full relative">
        <div data-testid="genre-tree-wheel-skeleton" />
      </div>
    ) : (
      <div data-testid="genre-tree-skeleton" />
    ),
}));

import { GenreTreeView, type ArtistSearchProps, type GenreFocusProps, type GenreTreeViewProps } from "./GenreTreeView";

const getBackendBaseUrl = () => "https://backend.example.com";

// requestAnimationFrame isn't driven by fake timers in jsdom — stub it onto a manually-flushable
// queue so tests can step through GenreTreeWheelHandoff's two nested rAFs deterministically.
function stubRaf() {
  let queue: FrameRequestCallback[] = [];
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    id += 1;
    queue.push(cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  return {
    flush: () => {
      const current = queue;
      queue = [];
      current.forEach((cb) => cb(0));
    },
  };
}

function makePlaylist(overrides: Record<string, unknown> = {}) {
  return {
    uuid: "gp1",
    name: "Jazz",
    root: { uuid: "root1" },
    parent: null,
    tracksCount: 3,
    viewsCount: 0,
    criteria: { uuid: "c1", name: "Jazz" },
    isUnacceptedRoot: false,
    ...overrides,
  };
}

function renderView(overrides: Partial<Omit<GenreTreeViewProps, keyof GenreFocusProps | keyof ArtistSearchProps>> & GenreFocusProps = {}) {
  const props: GenreTreeViewProps = {
    scope: "me",
    handleGenreCreationAction: vi.fn(),
    handleGenreRenameAction: vi.fn(),
    getBackendBaseUrl,
    artistSearch: false,
    ...overrides,
  };
  render(<GenreTreeView {...props} />);
  return props;
}

const PANEL_SECTIONS = {
  toolbar: <p>Toolbar</p>,
  ancestors: <p>Ancestors</p>,
  family: <p>Family</p>,
  itemCount: <p>Count</p>,
};

describe("GenreTreeView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: [],
      isPending: false,
    });
    useFetchGenreOverviewMock.mockReturnValue({ data: undefined, isPending: false });
    useArtistSearchMock.mockReturnValue({ artists: [], isError: false, settled: false, pending: false });
    useArtistMock.mockImplementation((uuid: string | null) => (uuid === null ? { status: "idle" } : { status: "loading" }));
    useArtistGenreCountsMock.mockReturnValue({ data: undefined, isPending: false, isError: false });
  });

  it("shows the wheel skeleton while the genre playlists are loading", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: undefined,
      isPending: true,
    });
    renderView();

    const skeleton = screen.getByTestId("genre-tree-wheel-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Stacked" }),
    ).not.toBeInTheDocument();
    // Loading state must occupy the same box as the loaded wheel/pop-core view
    // (see GenrePlaylistTreeWheel's "tree-container" wrapper below), not a smaller,
    // intrinsically-sized one — otherwise the skeleton doesn't match the real view's box.
    expect(skeleton.parentElement).toHaveClass(
      "tree-container",
      "flex-1",
      "min-h-0",
      "w-full",
      "relative",
    );
  });

  it("calls handleGenreCreationAction(null) when Add root is clicked", () => {
    const handleGenreCreationAction = vi.fn();
    renderView({ handleGenreCreationAction });

    fireEvent.click(screen.getByRole("button", { name: /Add root/ }));

    expect(handleGenreCreationAction).toHaveBeenCalledWith(null);
  });

  it("renders stacked view when selected, grouping playlists by root", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: [
        makePlaylist({ uuid: "gp1", root: { uuid: "root1" } }),
        makePlaylist({ uuid: "gp2", root: { uuid: "root2" } }),
      ],
      isPending: false,
    });
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));

    expect(screen.getByRole("button", { name: "Stacked" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Wheel" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByTestId("tree-per-root")).toHaveLength(2);
    expect(screen.queryByTestId("tree-wheel")).not.toBeInTheDocument();
  });

  it("passes selectedNodeId only to the stacked tree whose root holds the selection", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: [
        makePlaylist({ uuid: "gp1", root: { uuid: "root1" } }),
        makePlaylist({ uuid: "gp2", name: "Rock", root: { uuid: "root2" } }),
      ],
      isPending: false,
    });
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));

    act(() => {
      treePerRootPropsMock.mock.calls[0][0].onSelectedNodeChange({ id: "gp2" });
    });

    const lastTwo = treePerRootPropsMock.mock.calls.slice(-2).map(([p]) => p.selectedNodeId);
    expect(lastTwo).toEqual([null, "gp2"]);
  });

  it("passes defaultViewport and onViewportChange only to the stacked tree whose root holds the selection", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: [
        makePlaylist({ uuid: "gp1", root: { uuid: "root1" } }),
        makePlaylist({ uuid: "gp2", name: "Rock", root: { uuid: "root2" } }),
      ],
      isPending: false,
    });
    const defaultViewport = { x: 10, y: 20, zoom: 1.5 };
    const onViewportChange = vi.fn();
    renderView({ selectedNodeId: "gp2", defaultViewport, onViewportChange });
    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));

    const [first, second] = treePerRootPropsMock.mock.calls.slice(-2).map(([p]) => p);
    expect(first.defaultViewport).toBeUndefined();
    expect(first.onViewportChange).toBeUndefined();
    expect(second.defaultViewport).toBe(defaultViewport);
    expect(second.onViewportChange).toBe(onViewportChange);
  });

  describe("floating host control", () => {
    it.each(["wheel", "pop-core"] as const)("renders before the size selector in %s view", (viewMode) => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist({ uuid: "gp1", name: "Mainstream Pop", root: { uuid: "gp1" }, parent: null })], isPending: false });
      renderView({ viewMode, floatingControlsLeading: <button type="button">Switch view</button> });
      const calls = viewMode === "wheel" ? treeWheelPropsMock : treeWheelRadialPopCorePropsMock;
      render(<>{calls.mock.calls.at(-1)?.[0].floatingControlsLeading}</>);
      const control = screen.getByRole("button", { name: "Switch view" });
      const songs = screen.getByRole("button", { name: "Size by songs" });
      expect(control.compareDocumentPosition(songs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("keeps the host control when view counts are unavailable", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist({ viewsCount: undefined })], isPending: false });
      renderView({ viewMode: "wheel", floatingControlsLeading: <button type="button">Switch view</button> });
      render(<>{treeWheelPropsMock.mock.calls.at(-1)?.[0].floatingControlsLeading}</>);
      expect(screen.getByRole("button", { name: "Switch view" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Size by songs" })).not.toBeInTheDocument();
    });

    it("renders the host control in outline view", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist({ uuid: "gp1", name: "Mainstream Pop", root: { uuid: "gp1" }, parent: null })], isPending: false });
      renderView({ viewMode: "outline", floatingControlsLeading: <button type="button">Switch view</button> });
      expect(screen.getByRole("button", { name: "Switch view" })).toBeInTheDocument();
    });
  });

  describe("size metric toggle", () => {
    const renderLeading = () => render(<>{treeWheelPropsMock.mock.calls.at(-1)?.[0].floatingControlsLeading}</>);

    it("starts on songs and switches the wheel to views when toggled", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist()], isPending: false });
      renderView({ viewMode: "wheel" });
      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].sizeMetric).toBe("songs");

      renderLeading();
      fireEvent.click(screen.getByRole("button", { name: "Size by views" }));

      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].sizeMetric).toBe("views");
    });

    it("follows a controlled sizeMetric and reports changes without switching itself", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist()], isPending: false });
      const onSizeMetricChange = vi.fn();
      renderView({ viewMode: "wheel", sizeMetric: "views", onSizeMetricChange });
      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].sizeMetric).toBe("views");

      renderLeading();
      fireEvent.click(screen.getByRole("button", { name: "Size by songs" }));

      expect(onSizeMetricChange).toHaveBeenCalledWith("songs");
      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].sizeMetric).toBe("views");
    });

    it("hides the toggle and sizes by songs when the backend sends no viewsCount", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist({ viewsCount: undefined })], isPending: false });
      renderView({ viewMode: "wheel", sizeMetric: "views" });

      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].sizeMetric).toBe("songs");
      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].floatingControlsLeading).toBeUndefined();
    });
  });

  describe("busy indicator", () => {
    const lastWheelProps = () => treeWheelPropsMock.mock.calls.at(-1)?.[0];

    it("is off once the tree is loaded and idle", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist()], isPending: false, isFetching: false });
      renderView({ viewMode: "wheel" });

      expect(lastWheelProps().busy).toBe(false);
    });

    it("is off after the size metric toggle settles", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist()], isPending: false, isFetching: false });
      renderView({ viewMode: "wheel" });
      render(<>{lastWheelProps().floatingControlsLeading}</>);
      fireEvent.click(screen.getByRole("button", { name: "Size by views" }));

      expect(lastWheelProps().busy).toBe(false);
    });

    it("keeps the tree mounted and turns busy on while the tree refetches", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist()], isPending: false, isFetching: true });
      renderView({ viewMode: "wheel" });

      expect(screen.getByTestId("tree-wheel")).toBeInTheDocument();
      expect(lastWheelProps().busy).toBe(true);
    });

    it("keeps the tree mounted and turns busy on while an artist's counts load", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist()], isPending: false, isFetching: false });
      useArtistGenreCountsMock.mockReturnValue({ data: undefined, isPending: true, isError: false });
      renderView({ viewMode: "wheel", artistUuid: "a1" });

      expect(screen.getByTestId("tree-wheel")).toBeInTheDocument();
      expect(lastWheelProps().genrePlaylists).toHaveLength(1);
      expect(lastWheelProps().busy).toBe(true);
    });
  });

  it("passes defaultViewport and onViewportChange to the wheel", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist()], isPending: false });
    const defaultViewport = { x: 10, y: 20, zoom: 1.5 };
    const onViewportChange = vi.fn();
    renderView({ viewMode: "wheel", defaultViewport, onViewportChange });

    const props = treeWheelPropsMock.mock.calls.at(-1)?.[0];
    expect(props.defaultViewport).toBe(defaultViewport);
    expect(props.onViewportChange).toBe(onViewportChange);
  });

  it("switches to wheel view and passes genre playlists through", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: [makePlaylist()],
      isPending: false,
    });
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

    expect(screen.getByTestId("tree-wheel")).toBeInTheDocument();
    expect(screen.queryByTestId("tree-per-root")).not.toBeInTheDocument();
    expect(treeWheelPropsMock.mock.calls[0][0].genrePlaylists).toEqual([
      makePlaylist(),
    ]);
  });

  it("defaults genrePlaylists to an empty array in wheel view when data is undefined", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: undefined,
      isPending: false,
    });
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

    expect(treeWheelPropsMock.mock.calls[0][0].genrePlaylists).toEqual([]);
  });

  it("switches back to stacked view", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: [makePlaylist()],
      isPending: false,
    });
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));

    expect(screen.getByTestId("tree-per-root")).toBeInTheDocument();
  });

  it("hides the Add root button when readOnly", () => {
    renderView({ readOnly: true });

    expect(
      screen.queryByRole("button", { name: /Add root/ }),
    ).not.toBeInTheDocument();
  });

  it("passes readOnly through to the tree components", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: [makePlaylist()],
      isPending: false,
    });
    renderView({ readOnly: true });

    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));
    expect(treePerRootPropsMock.mock.calls[0][0].readOnly).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
    expect(treeWheelPropsMock.mock.calls[0][0].readOnly).toBe(true);
  });

  it("passes the info panel curation props through to the stacked and wheel trees", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist()], isPending: false });
    const curation = {
      renderDangerZone: vi.fn(),
      expanded: true,
      onExpandedChange: vi.fn(),
    };
    renderView({ ...curation });
    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));
    expect(treePerRootPropsMock.mock.calls.at(-1)?.[0]).toMatchObject(curation);
    fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
    expect(treeWheelPropsMock.mock.calls.at(-1)?.[0]).toMatchObject(curation);
  });

  it("forwards overlayPanel to every view", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: [makePlaylist({ uuid: "gp1", name: "Mainstream Pop", root: { uuid: "gp1" }, parent: null })],
      isPending: false,
    });
    const overlayPanel = { title: "About", content: <p>About body</p>, onClose: vi.fn() };
    renderView({ overlayPanel });
    fireEvent.click(screen.getByRole("button", { name: "Pop/Core" }));
    expect(treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0].overlayPanel).toBe(overlayPanel);
    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));
    expect(treePerRootPropsMock.mock.calls.at(-1)?.[0].overlayPanel).toBe(overlayPanel);
    fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
    expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].overlayPanel).toBe(overlayPanel);
  });

  it("hands overlayPanel to a single root in the stacked view", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: [
        makePlaylist({ uuid: "a", name: "A", root: { uuid: "a" }, parent: null }),
        makePlaylist({ uuid: "b", name: "B", root: { uuid: "b" }, parent: null }),
      ],
      isPending: false,
    });
    const overlayPanel = { title: "About", content: <p>About body</p>, onClose: vi.fn() };
    renderView({ overlayPanel });
    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));
    treePerRootPropsMock.mockClear();
    cleanup();
    renderView({ overlayPanel, viewMode: "stacked" });
    const withOverlay = treePerRootPropsMock.mock.calls.filter(([props]) => props.overlayPanel);
    expect(treePerRootPropsMock.mock.calls.length).toBeGreaterThan(1);
    expect(new Set(withOverlay.map(([props]) => props.rootUuid)).size).toBe(1);
  });

  describe("layout props", () => {
    beforeEach(() => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist()], isPending: false });
    });

    it("applies className to the root and adds no outer margin by default", () => {
      const { container } = render(
        <GenreTreeView
          scope="me"
          handleGenreCreationAction={vi.fn()}
          handleGenreRenameAction={vi.fn()}
          getBackendBaseUrl={getBackendBaseUrl}
          artistSearch={false}
          className="my-root"
        />,
      );
      expect(container.firstElementChild).toHaveClass("my-root");
      expect(container.firstElementChild).not.toHaveClass("mt-4");
    });

    it("sets the region custom properties on the root only with placement=regions", () => {
      const { container, rerender } = render(
        <GenreTreeView
          scope="me"
          handleGenreCreationAction={vi.fn()}
          handleGenreRenameAction={vi.fn()}
          getBackendBaseUrl={getBackendBaseUrl}
          artistSearch={false}
        />,
      );
      expect(container.firstElementChild?.className).not.toContain("--gtv-center-left");

      rerender(
        <GenreTreeView
          scope="me"
          handleGenreCreationAction={vi.fn()}
          handleGenreRenameAction={vi.fn()}
          getBackendBaseUrl={getBackendBaseUrl}
          artistSearch={false}
          placement="regions"
        />,
      );
      expect(container.firstElementChild?.className).toContain("--gtv-center-left:var(--layout-center-left)");
    });

    describe("detail edge tab", () => {
      const tabProps = { placement: "regions", selectedNodeId: "gp1" } as const;

      it("is absent without a selection or outside regions placement", () => {
        renderView({ placement: "regions", onCollapsedChange: vi.fn() });
        expect(screen.queryByRole("button", { name: "Hide panel" })).not.toBeInTheDocument();
        cleanup();
        renderView({ selectedNodeId: "gp1", onCollapsedChange: vi.fn() });
        expect(screen.queryByRole("button", { name: "Hide panel" })).not.toBeInTheDocument();
      });

      describe("readiness", () => {
        const tabWrapper = () =>
          screen.getByRole("button", { name: "Hide panel" }).closest(".panel-edge-tab")?.parentElement as HTMLElement;

        afterEach(() => {
          vi.unstubAllGlobals();
        });

        it("stays hidden while the genre playlists load", () => {
          useListFullGenrePlaylistsMock.mockReturnValue({ data: undefined, isPending: true });
          renderView({ ...tabProps, viewMode: "stacked" });
          expect(tabWrapper()).toHaveClass("invisible", "opacity-0", "pointer-events-none");
        });

        it("fades in with the wheel only after its handoff reveals it", () => {
          const raf = stubRaf();
          renderView({ ...tabProps, viewMode: "wheel" });
          expect(tabWrapper()).toHaveClass("invisible", "opacity-0");
          act(() => {
            raf.flush();
            raf.flush();
          });
          expect(tabWrapper()).toHaveClass("opacity-100");
          expect(tabWrapper()).not.toHaveClass("invisible");
        });

        it("shows right away in a view without a handoff", () => {
          renderView({ ...tabProps, viewMode: "stacked" });
          expect(tabWrapper()).toHaveClass("opacity-100");
        });
      });

      it("works uncontrolled when no callbacks are passed", () => {
        renderView(tabProps);
        fireEvent.click(screen.getByRole("button", { name: "Extend panel" }));
        expect(screen.getByRole("button", { name: "Shrink panel" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Shrink panel" }));
        fireEvent.click(screen.getByRole("button", { name: "Hide panel" }));
        expect(screen.getByRole("button", { name: "Show panel" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Hide panel" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Show panel" }));
        expect(screen.getByRole("button", { name: "Hide panel" })).toBeInTheDocument();
      });

      it("sets --layout-left-w to 0px on the document only while hidden in regions placement", () => {
        const root = document.documentElement;
        renderView(tabProps);
        expect(root.style.getPropertyValue("--layout-left-w")).toBe("");
        fireEvent.click(screen.getByRole("button", { name: "Hide panel" }));
        expect(root.style.getPropertyValue("--layout-left-w")).toBe("0px");
        fireEvent.click(screen.getByRole("button", { name: "Show panel" }));
        expect(root.style.getPropertyValue("--layout-left-w")).toBe("");
        cleanup();
        renderView({ selectedNodeId: "gp1", collapsed: true });
        expect(root.style.getPropertyValue("--layout-left-w")).toBe("");
      });

      it("hides or extends the panel from the default state", () => {
        const onCollapsedChange = vi.fn();
        const onExpandedChange = vi.fn();
        renderView({ ...tabProps, collapsed: false, onCollapsedChange, onExpandedChange });
        fireEvent.click(screen.getByRole("button", { name: "Hide panel" }));
        expect(onCollapsedChange).toHaveBeenCalledWith(true);
        fireEvent.click(screen.getByRole("button", { name: "Extend panel" }));
        expect(onExpandedChange).toHaveBeenCalledWith(true);
      });

      it("offers only Show panel while collapsed", () => {
        const onCollapsedChange = vi.fn();
        renderView({ ...tabProps, collapsed: true, onCollapsedChange, onExpandedChange: vi.fn() });
        expect(screen.queryByRole("button", { name: "Hide panel" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Extend panel" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Show panel" }));
        expect(onCollapsedChange).toHaveBeenCalledWith(false);
      });

      it("offers only Shrink panel while expanded", () => {
        const onExpandedChange = vi.fn();
        renderView({ ...tabProps, expanded: true, onCollapsedChange: vi.fn(), onExpandedChange });
        expect(screen.queryByRole("button", { name: "Hide panel" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Shrink panel" }));
        expect(onExpandedChange).toHaveBeenCalledWith(false);
      });

      it("drives an expandable overlay panel instead of the info panel", () => {
        const overlayExpandedChange = vi.fn();
        const infoExpandedChange = vi.fn();
        const overlayPanel = { title: "Artist", content: "x", onClose: vi.fn(), onExpandedChange: overlayExpandedChange };
        const props = { placement: "regions", onCollapsedChange: vi.fn(), onExpandedChange: infoExpandedChange } as const;
        renderView({ ...props, overlayPanel });
        fireEvent.click(screen.getByRole("button", { name: "Extend panel" }));
        expect(overlayExpandedChange).toHaveBeenCalledWith(true);
        expect(infoExpandedChange).not.toHaveBeenCalled();
        cleanup();
        renderView({ ...props, overlayPanel: { ...overlayPanel, expanded: true } });
        fireEvent.click(screen.getByRole("button", { name: "Shrink panel" }));
        expect(overlayExpandedChange).toHaveBeenCalledWith(false);
      });

      it("ignores a non-expandable overlay panel", () => {
        renderView({
          placement: "regions",
          onCollapsedChange: vi.fn(),
          overlayPanel: { title: "About", content: "x", onClose: vi.fn() },
        });
        expect(screen.queryByRole("button", { name: "Hide panel" })).not.toBeInTheDocument();
      });
    });

    it("shows the display options group by default", () => {
      renderView();
      expect(screen.getByRole("group", { name: "Tree display options" })).toBeInTheDocument();
    });

    it("hides the display options group when showDisplayOptions is false", () => {
      renderView({ showDisplayOptions: false });
      expect(screen.queryByRole("group", { name: "Tree display options" })).not.toBeInTheDocument();
    });
  });

  describe("rotation and toolbar toggles", () => {
    it("default to off and are passed through to the wheel view", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [makePlaylist()],
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

      expect(treeWheelPropsMock.mock.calls[0][0].allowWheelRotation).toBe(
        false,
      );
    });

    it("toggle on and pass through to the wheel view", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [makePlaylist()],
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
      fireEvent.click(screen.getByRole("button", { name: "Rotation" }));

      expect(
        treeWheelPropsMock.mock.calls.at(-1)?.[0].allowWheelRotation,
      ).toBe(true);
    });

    it("pass through to the pop-core view", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [
          makePlaylist({
            uuid: "gp1",
            name: "Mainstream Pop",
            root: { uuid: "gp1" },
            parent: null,
          }),
        ],
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Pop/Core" }));
      fireEvent.click(screen.getByRole("button", { name: "Rotation" }));

      expect(
        treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0]
          .allowWheelRotation,
      ).toBe(true);
    });

    it("hides the Rotation toggle in stacked view", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [makePlaylist()],
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Stacked" }));

      expect(
        screen.queryByRole("button", { name: "Rotation" }),
      ).not.toBeInTheDocument();

    });

    it("renders stacked trees in modifier wheel-zoom mode so the list can scroll", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [makePlaylist()],
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Stacked" }));

      expect(treePerRootPropsMock.mock.calls.at(-1)?.[0].wheelZoom).toBe(
        "modifier",
      );
    });
  });

  it("defaults controlsOrientation to horizontal on the pop-core, wheel and stacked views", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: [makePlaylist({ uuid: "gp1", name: "Mainstream Pop", root: { uuid: "gp1" }, parent: null })],
      isPending: false,
    });
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Pop/Core" }));
    expect(treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0].controlsOrientation).toBe("horizontal");

    fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
    expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].controlsOrientation).toBe("horizontal");

    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));
    expect(treePerRootPropsMock.mock.calls.at(-1)?.[0].controlsOrientation).toBe("horizontal");
  });

  it("passes controlsOrientation through to the pop-core, wheel and stacked views", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: [makePlaylist({ uuid: "gp1", name: "Mainstream Pop", root: { uuid: "gp1" }, parent: null })],
      isPending: false,
    });
    renderView({ controlsOrientation: "vertical" });

    fireEvent.click(screen.getByRole("button", { name: "Pop/Core" }));
    expect(treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0].controlsOrientation).toBe("vertical");

    fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
    expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].controlsOrientation).toBe("vertical");

    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));
    expect(treePerRootPropsMock.mock.calls.at(-1)?.[0].controlsOrientation).toBe("vertical");
  });

  it("passes focus props to the pop-core view only, not to outline", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: [makePlaylist({ uuid: "gp1", name: "Mainstream Pop", root: { uuid: "gp1" }, parent: null })],
      isPending: false,
    });
    const onFocusGenreChange = vi.fn();
    renderView({ focusGenreUuid: "gp1", onFocusGenreChange });

    fireEvent.click(screen.getByRole("button", { name: "Pop/Core" }));
    const popCoreProps = treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0];
    expect(popCoreProps.focusGenreUuid).toBe("gp1");
    expect(popCoreProps.onFocusGenreChange).toBe(onFocusGenreChange);

    fireEvent.click(screen.getByRole("button", { name: "Outline" }));
    const outlineProps = treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0];
    expect(outlineProps.outline).toBe(true);
    expect(outlineProps).not.toHaveProperty("focusGenreUuid");
    expect(outlineProps).not.toHaveProperty("onFocusGenreChange");
  });

  it("requires focusGenreUuid and onFocusGenreChange together at the type level", () => {
    const base = {
      scope: "me",
      handleGenreCreationAction: vi.fn(),
      handleGenreRenameAction: vi.fn(),
      getBackendBaseUrl,
      artistSearch: false,
    } as const;
    // @ts-expect-error focusGenreUuid without onFocusGenreChange
    const focusOnly: GenreTreeViewProps = { ...base, focusGenreUuid: "gp1" };
    // @ts-expect-error onFocusGenreChange without focusGenreUuid
    const callbackOnly: GenreTreeViewProps = { ...base, onFocusGenreChange: vi.fn() };
    expect([focusOnly, callbackOnly]).toHaveLength(2);
  });

  describe("outline view", () => {
    it("switches to the outline view and hides the Rotation toggle", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [
          makePlaylist({
            uuid: "gp1",
            name: "Mainstream Pop",
            root: { uuid: "gp1" },
            parent: null,
          }),
        ],
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Outline" }));

      expect(treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0].outline).toBe(true);
      expect(screen.queryByRole("button", { name: "Rotation" })).not.toBeInTheDocument();
    });

    it("falls back to the wheel view for a controlled outline mode with no 'Mainstream Pop' root", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [makePlaylist({ root: { uuid: "gp1" } })],
        isPending: false,
      });
      renderView({ viewMode: "outline" });

      expect(treeWheelRadialPopCorePropsMock).not.toHaveBeenCalled();
      expect(treeWheelPropsMock).toHaveBeenCalled();
    });
  });

  describe("criteria-less playlists (Genreless)", () => {
    const pop = makePlaylist({
      uuid: "gp1",
      name: "Mainstream Pop",
      root: { uuid: "gp1" },
      parent: null,
    });
    const genreless = makePlaylist({
      uuid: "gp2",
      name: "Genreless",
      root: { uuid: "gp2" },
      parent: null,
      criteria: null,
    });

    beforeEach(() => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [pop, genreless], isPending: false });
    });

    function searchGenreless() {
      fireEvent.change(screen.getByLabelText("Search a genre"), { target: { value: "genrel" } });
    }

    it("excludes them from the wheel view and its search", () => {
      renderView({ viewMode: "wheel" });

      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].genrePlaylists).toEqual([pop]);
      searchGenreless();
      expect(screen.queryByRole("button", { name: "Genreless" })).not.toBeInTheDocument();
    });

    it("excludes them from the pop-core view", () => {
      renderView({ viewMode: "pop-core" });

      expect(treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0].genrePlaylists).toEqual([pop]);
    });

    it("keeps them in the outline view and its search", () => {
      renderView({ viewMode: "outline" });

      expect(treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0].genrePlaylists).toEqual([
        pop,
        genreless,
      ]);
      searchGenreless();
      expect(screen.getByRole("button", { name: "Genreless" })).toBeInTheDocument();
    });
  });

  describe("unaccepted roots", () => {
    const pop = makePlaylist({
      uuid: "gp1",
      name: "Mainstream Pop",
      root: { uuid: "gp1" },
      parent: null,
    });
    const unacceptedRoot = makePlaylist({
      uuid: "gp2",
      name: "Imported Root",
      root: { uuid: "gp2" },
      parent: null,
      isUnacceptedRoot: true,
    });
    const unacceptedChild = makePlaylist({
      uuid: "gp3",
      name: "Imported Child",
      root: { uuid: "gp2" },
      parent: { uuid: "gp2" },
    });

    beforeEach(() => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [pop, unacceptedRoot, unacceptedChild],
        isPending: false,
      });
    });

    function searchImported() {
      fireEvent.change(screen.getByLabelText("Search a genre"), { target: { value: "imported" } });
    }

    it("hides them and their subtree from the wheel view and its search", () => {
      renderView({ viewMode: "wheel" });

      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].genrePlaylists).toEqual([pop]);
      searchImported();
      expect(screen.queryByRole("button", { name: "Imported Root" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Imported Child" })).not.toBeInTheDocument();
    });

    it("hides them and their subtree from the pop-core view", () => {
      renderView({ viewMode: "pop-core" });

      expect(treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0].genrePlaylists).toEqual([pop]);
    });

    it("hides them and their subtree from the outline view", () => {
      renderView({ viewMode: "outline" });

      expect(treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0].genrePlaylists).toEqual([pop]);
    });

    it("keeps them and their subtree in the stacked view", () => {
      renderView({ viewMode: "stacked" });

      const rendered = treePerRootPropsMock.mock.calls.flatMap(
        ([props]) => props.genrePlaylistTreePerRoot,
      );
      expect(rendered).toEqual(expect.arrayContaining([unacceptedRoot, unacceptedChild]));
      searchImported();
      expect(screen.getByRole("button", { name: "Imported Root" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Imported Child" })).toBeInTheDocument();
    });
  });

  describe("pop-core view", () => {
    it("disables the Pop/Core toggle with an explanatory title when there is no 'Mainstream Pop' root", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [
          makePlaylist({
            uuid: "gp1",
            name: "Rock",
            root: { uuid: "gp1" },
            parent: null,
          }),
        ],
        isPending: false,
      });
      renderView();

      const popCoreButton = screen.getByRole("button", { name: "Pop/Core" });
      expect(popCoreButton).toBeDisabled();
      expect(popCoreButton).toHaveAttribute(
        "title",
        "This genre tree has no 'Mainstream Pop' root yet",
      );
    });

    it("enables the Pop/Core toggle when a 'Mainstream Pop' root exists", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [
          makePlaylist({
            uuid: "gp1",
            name: "Mainstream Pop",
            root: { uuid: "gp1" },
            parent: null,
          }),
        ],
        isPending: false,
      });
      renderView();

      expect(screen.getByRole("button", { name: "Pop/Core" })).toBeEnabled();
    });

    it("switches to the pop-core view and passes genre playlists through", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [
          makePlaylist({
            uuid: "gp1",
            name: "Mainstream Pop",
            root: { uuid: "gp1" },
            parent: null,
          }),
        ],
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Pop/Core" }));

      expect(
        screen.getByTestId("tree-wheel-radial-pop-core"),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("tree-per-root")).not.toBeInTheDocument();
      expect(
        treeWheelRadialPopCorePropsMock.mock.calls[0][0].genrePlaylists,
      ).toEqual([
        makePlaylist({
          uuid: "gp1",
          name: "Mainstream Pop",
          root: { uuid: "gp1" },
          parent: null,
        }),
      ]);
    });

    it("passes readOnly through to the pop-core tree component", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [
          makePlaylist({
            uuid: "gp1",
            name: "Mainstream Pop",
            root: { uuid: "gp1" },
            parent: null,
          }),
        ],
        isPending: false,
      });
      renderView({ readOnly: true });

      fireEvent.click(screen.getByRole("button", { name: "Pop/Core" }));

      expect(treeWheelRadialPopCorePropsMock.mock.calls[0][0].readOnly).toBe(
        true,
      );
    });

    it("never mounts the pop-core tree — not even transiently — when data loads with no 'Mainstream Pop' root", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: undefined,
        isPending: true,
      });
      const props: GenreTreeViewProps = {
        scope: "me",
        handleGenreCreationAction: vi.fn(),
        handleGenreRenameAction: vi.fn(),
        getBackendBaseUrl,
        artistSearch: false,
      };
      const { rerender } = render(<GenreTreeView {...props} />);

      // Loading finishes on data with no "Mainstream Pop" root while still defaulted to
      // "pop-core" — GenrePlaylistTreeWheelRadialPopCore throws on mount without that root, so
      // it must never be rendered here, not even for the one commit before the corrective effect
      // would otherwise run.
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [
          makePlaylist({
            uuid: "gp1",
            name: "Rock",
            root: { uuid: "gp1" },
            parent: null,
          }),
        ],
        isPending: false,
      });
      rerender(<GenreTreeView {...props} />);

      expect(treeWheelRadialPopCorePropsMock).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId("tree-wheel-radial-pop-core"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("tree-wheel")).toBeInTheDocument();
    });
  });

  describe("skeleton-to-graph handoff", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("keeps a wheel skeleton visible with no gap across the loading-to-pop-core handoff", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: undefined,
        isPending: true,
      });
      const props: GenreTreeViewProps = {
        scope: "me",
        handleGenreCreationAction: vi.fn(),
        handleGenreRenameAction: vi.fn(),
        getBackendBaseUrl,
        artistSearch: false,
      };
      const { rerender } = render(<GenreTreeView {...props} />);

      expect(
        screen.getByTestId("genre-tree-wheel-skeleton"),
      ).toBeInTheDocument();

      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [
          makePlaylist({
            uuid: "gp1",
            name: "Mainstream Pop",
            root: { uuid: "gp1" },
            parent: null,
          }),
        ],
        isPending: false,
      });
      rerender(<GenreTreeView {...props} />);

      // The real pop-core tree has mounted (so it can compute its own layout/fit), but the
      // skeleton is still on top of it — nothing unmounts in between, so there's no frame where
      // neither is shown, and the skeleton itself hasn't changed.
      expect(
        screen.getByTestId("genre-tree-wheel-skeleton"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("tree-wheel-radial-pop-core"),
      ).toBeInTheDocument();
    });

    it("reveals the pop-core graph and drops the skeleton only once the graph has had time to settle", () => {
      const raf = stubRaf();
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [
          makePlaylist({
            uuid: "gp1",
            name: "Mainstream Pop",
            root: { uuid: "gp1" },
            parent: null,
          }),
        ],
        isPending: false,
      });
      renderView();

      // Handoff still hiding the graph behind its own skeleton right after mount.
      expect(
        screen.getByTestId("genre-tree-wheel-skeleton"),
      ).toBeInTheDocument();

      act(() => {
        raf.flush();
        raf.flush();
      });

      expect(
        screen.queryByTestId("genre-tree-wheel-skeleton"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId("tree-wheel-radial-pop-core"),
      ).toBeInTheDocument();
    });

    it("reveals the wheel graph and drops the skeleton only once the graph has had time to settle", () => {
      const raf = stubRaf();
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [makePlaylist()],
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

      expect(
        screen.getByTestId("genre-tree-wheel-skeleton"),
      ).toBeInTheDocument();

      act(() => {
        raf.flush();
        raf.flush();
      });

      expect(
        screen.queryByTestId("genre-tree-wheel-skeleton"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("tree-wheel")).toBeInTheDocument();
    });
  });

  describe("renderInfoPanelBody", () => {
    function selectGenre(id = "gp1") {
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
      act(() => {
        treeWheelPropsMock.mock.calls.at(-1)?.[0].onSelectedNodeChange({ id });
      });
    }

    function renderBodyFor(id: string) {
      const output = treeWheelPropsMock.mock.calls.at(-1)?.[0].renderInfoPanelBody({ id }, PANEL_SECTIONS);
      render(
        <>
          {output.primary}
          <aside>{output.aside}</aside>
        </>,
      );
      return output;
    }

    function sectionOrder() {
      const labels = ["Essential tracks", "Summary", "Family", "Count"];
      return Array.from(document.body.querySelectorAll("*"))
        .filter((el) => el.children.length === 0 && labels.includes(el.textContent ?? ""))
        .map((el) => el.textContent);
    }

    function mockOverview(overviews: Record<string, Record<string, unknown>>) {
      useFetchGenreOverviewMock.mockImplementation((id: string | null) =>
        id !== null && overviews[id]
          ? { data: { uuid: id, name: "", summary: null, ...overviews[id] }, isPending: false }
          : { data: undefined, isPending: false },
      );
    }

    beforeEach(() => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [
          makePlaylist({ uuid: "gp1", criteria: { uuid: "c1", name: "Jazz" } }),
          makePlaylist({ uuid: "gp2", criteria: { uuid: "c2", name: "Blues" } }),
          makePlaylist({ uuid: "gp3", criteria: null }),
        ],
        isPending: false,
      });
    });

    it("fetches the overview for the rendered node's criteria uuid", () => {
      renderView();
      selectGenre();

      renderBodyFor("gp1");

      expect(useFetchGenreOverviewMock).toHaveBeenCalledWith("c1");
    });

    it("keeps the built-in toolbar, Family and Ancestors for a node with no associated criteria", () => {
      renderView();
      selectGenre("gp3");

      renderBodyFor("gp3");

      expect(screen.getByText("Toolbar")).toBeInTheDocument();
      expect(screen.getByText("Family")).toBeInTheDocument();
      expect(screen.getByRole("complementary")).toHaveTextContent("Ancestors");
      expect(screen.queryByText("Count")).not.toBeInTheDocument();
    });

    it("places Family right after the Summary, Ancestors in the aside, and drops the count row", () => {
      mockOverview({ c1: { summary: "Loud guitars", essentialSongs: [] } });
      renderView();
      selectGenre();

      renderBodyFor("gp1");

      expect(sectionOrder()).toEqual(["Summary", "Family", "Essential tracks"]);
      expect(screen.getByRole("complementary")).toHaveTextContent("Ancestors");
      expect(screen.getByRole("complementary")).not.toHaveTextContent("Family");
    });

    it("shows Family after the Summary skeleton while the overview loads", () => {
      useFetchGenreOverviewMock.mockReturnValue({ data: undefined, isPending: true });
      renderView();
      selectGenre();

      renderBodyFor("gp1");

      expect(sectionOrder()).toEqual(["Summary", "Family"]);
    });

    it("renders essential tracks and consumer detail extras", () => {
      mockOverview({
        c1: {
          name: "Jazz",
          essentialSongs: [
            { uuid: "t1", title: "Track One", artists: null },
            { uuid: "t2", title: "Track Two", artists: null },
          ],
        },
      });
      renderView({
        renderGenreDetailExtras: (overview) => <p>Extra for {overview.name}</p>,
      });
      selectGenre();

      renderBodyFor("gp1");

      expect(screen.getByText("Track One")).toBeInTheDocument();
      expect(screen.getByText("Track Two")).toBeInTheDocument();
      expect(screen.getByText("Extra for Jazz")).toBeInTheDocument();
    });

    it("omits the essential tracks section when the scope's overview has none (e.g. hear)", () => {
      mockOverview({ c1: { summary: "Loud guitars" } });
      renderView();
      selectGenre();

      renderBodyFor("gp1");

      expect(screen.getByText("Loud guitars")).toBeInTheDocument();
      expect(screen.queryByText("Essential tracks")).not.toBeInTheDocument();
    });

    it("renders the genre summary", () => {
      mockOverview({ c1: { summary: "Improvised music with swung rhythms." } });
      renderView();
      selectGenre();

      renderBodyFor("gp1");

      expect(screen.getByText("Improvised music with swung rhythms.")).toBeInTheDocument();
    });

    it("renders the overview of whichever node the panel shows (e.g. info-panel chip navigation)", () => {
      mockOverview({ c1: { summary: "Jazz summary" }, c2: { summary: "Blues summary" } });
      renderView();
      selectGenre("gp1");

      renderBodyFor("gp2");

      expect(screen.getByText("Blues summary")).toBeInTheDocument();
      expect(screen.queryByText("Jazz summary")).not.toBeInTheDocument();
    });

    it("renders a skeleton while the overview is loading", () => {
      useFetchGenreOverviewMock.mockReturnValue({ data: undefined, isPending: true });
      renderView();
      selectGenre();

      renderBodyFor("gp1");

      expect(screen.getByTestId("genre-detail-extras-skeleton")).toBeInTheDocument();
    });

    it("renders only Family when the overview failed to load", () => {
      renderView();
      selectGenre();

      renderBodyFor("gp1");

      expect(screen.queryByText("Summary")).not.toBeInTheDocument();
      expect(screen.getByText("Family")).toBeInTheDocument();
    });

    it("renders blank summary and essential tracks placeholders when there is no summary, and no essential tracks", () => {
      mockOverview({ c1: { essentialSongs: [] } });
      renderView();
      selectGenre();

      renderBodyFor("gp1");

      expect(screen.getByText("Summary")).toBeInTheDocument();
      expect(screen.getByText("Essential tracks")).toBeInTheDocument();
      expect(screen.getAllByText("—")).toHaveLength(2);
    });

    // Perf regression guard: a selection must not hand the tree a new renderInfoPanelBody, and the
    // tree must not own the overview fetch — otherwise every fetch state change re-renders it.
    it("keeps renderInfoPanelBody stable across selections and never fetches from the tree's render", () => {
      renderView();
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
      const before = treeWheelPropsMock.mock.calls.at(-1)?.[0].renderInfoPanelBody;

      act(() => {
        treeWheelPropsMock.mock.calls.at(-1)?.[0].onSelectedNodeChange({ id: "gp1" });
      });
      act(() => {
        treeWheelPropsMock.mock.calls.at(-1)?.[0].onSelectedNodeChange({ id: "gp2" });
      });

      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].renderInfoPanelBody).toBe(before);
      expect(useFetchGenreOverviewMock).not.toHaveBeenCalled();
    });
  });

  describe("hover prefetch", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [
          makePlaylist({ uuid: "gp1", criteria: { uuid: "c1", name: "Jazz" } }),
          makePlaylist({ uuid: "gp2", criteria: { uuid: "c2", name: "Blues" } }),
          makePlaylist({ uuid: "gp3", criteria: null }),
        ],
        isPending: false,
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function hover(id: string) {
      treeWheelPropsMock.mock.calls.at(-1)?.[0].onNodeHover({ id });
    }

    it("prefetches the hovered node's overview once the pointer rests", () => {
      renderView();
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

      hover("gp1");
      expect(prefetchGenreOverviewMock).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);

      expect(prefetchGenreOverviewMock).toHaveBeenCalledExactlyOnceWith("c1");
    });

    it("only prefetches the last node when the pointer sweeps across rows", () => {
      renderView();
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

      hover("gp1");
      vi.advanceTimersByTime(50);
      hover("gp2");
      vi.advanceTimersByTime(100);

      expect(prefetchGenreOverviewMock).toHaveBeenCalledExactlyOnceWith("c2");
    });

    it("doesn't prefetch a node with no associated criteria", () => {
      renderView();
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

      hover("gp1");
      hover("gp3");
      vi.advanceTimersByTime(100);

      expect(prefetchGenreOverviewMock).not.toHaveBeenCalled();
    });

    it("cancels a pending prefetch on unmount", () => {
      renderView();
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

      hover("gp1");
      cleanup();
      vi.advanceTimersByTime(100);

      expect(prefetchGenreOverviewMock).not.toHaveBeenCalled();
    });

    it("passes onNodeHover to every tree renderer", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [makePlaylist({ uuid: "gp1", name: "Mainstream Pop", parent: null })],
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Stacked" }));
      expect(treePerRootPropsMock.mock.calls.at(-1)?.[0].onNodeHover).toEqual(expect.any(Function));
      fireEvent.click(screen.getByRole("button", { name: "Pop/Core" }));
      expect(treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0].onNodeHover).toEqual(expect.any(Function));
      fireEvent.click(screen.getByRole("button", { name: "Outline" }));
      expect(treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0]).toMatchObject({
        outline: true,
        onNodeHover: expect.any(Function),
      });
    });
  });

  describe("genre search", () => {
    it("selecting a search result updates the info panel the same way a node click does", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } })],
        isPending: false,
      });
      useFetchGenreOverviewMock.mockImplementation((id: string | null) =>
        id === "c1"
          ? {
              data: { uuid: "c1", name: "Jazz", summary: "Improvised music with swung rhythms.", essentialSongs: [] },
              isPending: false,
            }
          : { data: undefined, isPending: false },
      );
      renderView();

      fireEvent.change(screen.getByRole("textbox", { name: "Search a genre" }), {
        target: { value: "Jazz" },
      });
      fireEvent.click(screen.getByText("Jazz"));

      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
      const output = treeWheelPropsMock.mock.calls.at(-1)?.[0].renderInfoPanelBody({
        id: "gp1",
      }, PANEL_SECTIONS);
      render(<>{output.primary}</>);

      expect(screen.getByText("Improvised music with swung rhythms.")).toBeInTheDocument();
    });

    it("passes the selected node id through to the active tree renderer for highlighting", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } })],
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
      fireEvent.change(screen.getByRole("textbox", { name: "Search a genre" }), {
        target: { value: "Jazz" },
      });
      fireEvent.click(screen.getByText("Jazz"));

      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].selectedNodeId).toBe("gp1");
    });

    it("fills the search bar with the selected genre's name and clears everything on ✕", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } })],
        isPending: false,
      });
      renderView();
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
      const input = screen.getByRole("textbox", { name: "Search a genre" });

      fireEvent.change(input, { target: { value: "Ja" } });
      fireEvent.click(screen.getByRole("button", { name: "Jazz" }));

      expect(input).toHaveValue("Jazz");
      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].hideInfoPanelClose).toBe(true);
      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].hideInfoPanelTitle).toBe(true);

      fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

      expect(input).toHaveValue("");
      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].selectedNodeId).toBeNull();
    });

    function openBand(id: string) {
      const output = treeWheelPropsMock.mock.calls.at(-1)?.[0].renderInfoPanelBody({ id }, PANEL_SECTIONS);
      render(<>{output.primary}</>);
    }

    it("plays the selected genre from the action band's Play button", () => {
      const jazz = makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } });
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [jazz], isPending: false });
      renderView();
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

      fireEvent.change(screen.getByRole("textbox", { name: "Search a genre" }), { target: { value: "Ja" } });
      fireEvent.click(screen.getByRole("button", { name: "Jazz" }));
      openBand("gp1");
      fireEvent.click(screen.getByRole("button", { name: "Play" }));

      expect(playNewTrackListFromGenrePlaylistMock).toHaveBeenCalledWith(jazz, "me");
    });

    it("pauses instead of reloading when the selected genre is already the playing tracklist", () => {
      const jazz = makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } });
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [jazz], isPending: false });
      trackListState.value = { origin: { type: "GENRE_PLAYLIST", uuid: "gp1" } };
      renderView();
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

      fireEvent.change(screen.getByRole("textbox", { name: "Search a genre" }), { target: { value: "Ja" } });
      fireEvent.click(screen.getByRole("button", { name: "Jazz" }));
      openBand("gp1");
      fireEvent.click(screen.getByRole("button", { name: "Play" }));

      expect(setIsPlayingMock).toHaveBeenCalledWith(true);
      expect(playNewTrackListFromGenrePlaylistMock).not.toHaveBeenCalled();
      trackListState.value = null;
    });

    it("logs when loading the genre playlist tracks fails", async () => {
      const jazz = makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } });
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [jazz], isPending: false });
      const failure = new Error("boom");
      playNewTrackListFromGenrePlaylistMock.mockRejectedValueOnce(failure);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      renderView();
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

      fireEvent.change(screen.getByRole("textbox", { name: "Search a genre" }), { target: { value: "Ja" } });
      fireEvent.click(screen.getByRole("button", { name: "Jazz" }));
      openBand("gp1");
      fireEvent.click(screen.getByRole("button", { name: "Play" }));

      await waitFor(() => expect(errorSpy).toHaveBeenCalledWith("Failed to load genre playlist tracks:", failure));
      errorSpy.mockRestore();
    });

    it("zooms from the action band in pop-core when the selected genre has children", () => {
      const parent = makePlaylist({ uuid: "gp1", name: "Mainstream Pop", root: { uuid: "gp1" }, criteria: { uuid: "c1", name: "Mainstream Pop" } });
      const child = makePlaylist({
        uuid: "gp2",
        name: "Bebop",
        parent: { uuid: "gp1" },
        criteria: { uuid: "c2", name: "Bebop", side: "pop" },
      });
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [parent, child], isPending: false });
      const onFocusGenreChange = vi.fn();
      renderView({ viewMode: "pop-core", focusGenreUuid: null, onFocusGenreChange });

      fireEvent.change(screen.getByRole("textbox", { name: "Search a genre" }), { target: { value: "Main" } });
      fireEvent.click(screen.getByRole("button", { name: "Mainstream Pop" }));
      const output = treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0].renderInfoPanelBody({ id: "gp1" }, PANEL_SECTIONS);
      render(<>{output.primary}</>);
      fireEvent.click(screen.getByRole("button", { name: "Focus" }));

      expect(onFocusGenreChange).toHaveBeenCalledWith("gp1", "zoom-in");
    });

    it("wires the action band's Add, Rename and Parent actions to the host callbacks", () => {
      const jazz = makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } });
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [jazz], isPending: false });
      const props = renderView();
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
      openBand("gp1");

      fireEvent.click(screen.getByRole("button", { name: "Add" }));
      fireEvent.click(screen.getByRole("button", { name: "Rename" }));
      fireEvent.click(screen.getByRole("button", { name: "Parent" }));

      expect(props.handleGenreCreationAction).toHaveBeenCalledWith(jazz.criteria);
      expect(props.handleGenreRenameAction).toHaveBeenCalledWith(jazz.criteria);
      expect(showPopupMock).toHaveBeenCalledOnce();
    });

    describe("change parent popup", () => {
      const jazz = makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } });
      const rock = makePlaylist({ uuid: "gp3", name: "Rock", criteria: { uuid: "c3", name: "Rock" } });

      it("shows the popup through the popup context", () => {
        useListFullGenrePlaylistsMock.mockReturnValue({ data: [jazz, rock], isPending: false });
        renderView();
        fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
        openBand("gp1");
        fireEvent.click(screen.getByRole("button", { name: "Parent" }));

        const popup = showPopupMock.mock.calls[0][0];
        expect(popup.type).toBe(ChangeParentPopup);
        expect(popup.props).toMatchObject({
          genrePlaylist: jazz,
          genrePlaylists: [jazz, rock],
          scope: "me",
          getBackendBaseUrl,
          onClose: hidePopupMock,
        });
      });

      it("hands onParentChanged to the popup", () => {
        const onParentChanged = vi.fn();
        useListFullGenrePlaylistsMock.mockReturnValue({ data: [jazz, rock], isPending: false });
        renderView({ onParentChanged });
        fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
        openBand("gp1");
        fireEvent.click(screen.getByRole("button", { name: "Parent" }));

        expect(showPopupMock.mock.calls[0][0].props.onParentChanged).toBe(onParentChanged);
      });

      it("does not hand a reparent mode to the tree components", () => {
        useListFullGenrePlaylistsMock.mockReturnValue({ data: [jazz, rock], isPending: false });
        renderView();
        fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

        const props = treeWheelPropsMock.mock.calls.at(-1)?.[0];
        expect(props.reparentingGenreUuid).toBeUndefined();
        expect(props.onReparentRequest).toBeUndefined();
      });
    });

    describe("side toggle", () => {
      const root = makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } });
      const bebop = makePlaylist({
        uuid: "gp2",
        name: "Bebop",
        parent: { uuid: "gp1" },
        criteria: { uuid: "c2", name: "Bebop", side: "core" },
      });
      const smoothJazz = makePlaylist({
        uuid: "gp3",
        name: "Smooth Jazz",
        parent: { uuid: "gp1" },
        criteria: { uuid: "c3", name: "Smooth Jazz", side: "pop" },
      });
      const hardBop = makePlaylist({
        uuid: "gp4",
        name: "Hard Bop",
        parent: { uuid: "gp2" },
        criteria: { uuid: "c4", name: "Hard Bop" },
      });

      function openWheelBand(nodeId: string, props: Parameters<typeof renderView>[0] = {}) {
        useListFullGenrePlaylistsMock.mockReturnValue({ data: [root, bebop, smoothJazz, hardBop], isPending: false });
        renderView(props);
        fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
        openBand(nodeId);
      }

      it("flips a root's pop child to core", () => {
        openWheelBand("gp3");
        fireEvent.click(screen.getByRole("button", { name: "Make core" }));

        expect(updateGenreMock).toHaveBeenCalledWith({ uuid: "c3", data: { side: "core" } });
      });

      it("disables Make pop when the root already has a pop child", () => {
        openWheelBand("gp2");

        const toggle = screen.getByRole("button", { name: "Make pop" });
        expect(toggle).toBeDisabled();
        expect(toggle).toHaveAttribute("title", "Smooth Jazz is already the pop side of Jazz");
      });

      it("enables Make pop when no sibling is pop", () => {
        useListFullGenrePlaylistsMock.mockReturnValue({ data: [root, bebop], isPending: false });
        renderView();
        fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
        openBand("gp2");
        fireEvent.click(screen.getByRole("button", { name: "Make pop" }));

        expect(updateGenreMock).toHaveBeenCalledWith({ uuid: "c2", data: { side: "pop" } });
      });

      it("is hidden for roots and deeper descendants", () => {
        openWheelBand("gp1");
        expect(screen.queryByRole("button", { name: /^Make (pop|core)$/ })).not.toBeInTheDocument();
        cleanup();

        openWheelBand("gp4");
        expect(screen.queryByRole("button", { name: /^Make (pop|core)$/ })).not.toBeInTheDocument();
      });

      it("is hidden when read-only", () => {
        openWheelBand("gp3", { readOnly: true });

        expect(screen.queryByRole("button", { name: "Make core" })).not.toBeInTheDocument();
      });
    });

    it("hides the mutating band actions when read-only", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist()], isPending: false });
      renderView({ readOnly: true });
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
      openBand("gp1");

      expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Rename" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Parent" })).not.toBeInTheDocument();
    });

    it("proxies the search field's Previous button to genre-tree-view's own previous button", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({ data: [makePlaylist()], isPending: false });
      const { container } = render(
        <GenreTreeView scope="me" handleGenreCreationAction={vi.fn()} handleGenreRenameAction={vi.fn()} getBackendBaseUrl={getBackendBaseUrl} artistSearch={false} />,
      );
      const libPrevious = document.createElement("button");
      libPrevious.className = "gtv-info-panel-previous";
      const onClick = vi.fn();
      libPrevious.addEventListener("click", onClick);
      const overlay = document.createElement("div");
      overlay.className = "search-overlay";
      overlay.appendChild(libPrevious);
      container.querySelector(".genre-tree-view")?.appendChild(overlay);

      fireEvent.click(screen.getByRole("button", { name: "Previous", hidden: true }));

      expect(onClick).toHaveBeenCalledOnce();
    });

    it("follows a controlled selectedNodeId and reports user selections without owning them", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [
          makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } }),
          makePlaylist({ uuid: "gp2", name: "Blues", criteria: { uuid: "c2", name: "Blues" } }),
        ],
        isPending: false,
      });
      const onSelectedNodeIdChange = vi.fn();
      const props: GenreTreeViewProps = {
        scope: "me",
        handleGenreCreationAction: vi.fn(),
        handleGenreRenameAction: vi.fn(),
        getBackendBaseUrl,
        artistSearch: false,
        viewMode: "wheel",
        selectedNodeId: "gp1",
        onSelectedNodeIdChange,
      };
      const { rerender } = render(<GenreTreeView {...props} />);
      const input = screen.getByRole("textbox", { name: "Search a genre" });

      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].selectedNodeId).toBe("gp1");
      expect(input).toHaveValue("Jazz");

      act(() => {
        treeWheelPropsMock.mock.calls.at(-1)?.[0].onSelectedNodeChange({ id: "gp2" });
      });

      expect(onSelectedNodeIdChange).toHaveBeenCalledWith("gp2");
      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].selectedNodeId).toBe("gp1");

      rerender(<GenreTreeView {...props} selectedNodeId="gp2" />);

      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].selectedNodeId).toBe("gp2");
      expect(input).toHaveValue("Blues");
    });

    it("shows the name of a genre selected from the tree in the search bar", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } })],
        isPending: false,
      });
      renderView();
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

      act(() => {
        treeWheelPropsMock.mock.calls.at(-1)?.[0].onSelectedNodeChange({ id: "gp1" });
      });

      expect(screen.getByRole("textbox", { name: "Search a genre" })).toHaveValue("Jazz");
      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].selectedNodeId).toBe("gp1");
    });
  });
  describe("artist search", () => {
    const artist = {
      uuid: "ar1",
      name: "Taylor Swift",
      disambiguation: "US singer",
      type: "person",
      country: "US",
      beginYear: 1989,
      endYear: null,
      matchedAlias: "T-Swizzle",
      recordingCount: 120,
    };

    function renderWithArtists(extra: { onArtistSelect?: (a: unknown) => void; artistSearchBaseUrl?: () => string } = {}) {
      const onArtistSelect = extra.onArtistSelect ?? vi.fn();
      render(
        <GenreTreeView
          scope="me"
          handleGenreCreationAction={vi.fn()}
          handleGenreRenameAction={vi.fn()}
          getBackendBaseUrl={getBackendBaseUrl}
          onArtistSelect={onArtistSelect}
          artistSearchBaseUrl={extra.artistSearchBaseUrl}
        />,
      );
      return onArtistSelect;
    }

    it("lists matching artists under an Artists heading and reports the picked one", () => {
      useArtistSearchMock.mockReturnValue({ artists: [artist], isError: false, settled: true });
      const onArtistSelect = renderWithArtists();

      fireEvent.change(screen.getByRole("textbox", { name: "Search" }), { target: { value: "taylor" } });

      expect(screen.getByText("Artists")).toBeInTheDocument();
      expect(screen.getByText(/also known as T-Swizzle/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Taylor Swift/ }));
      expect(onArtistSelect).toHaveBeenCalledWith(artist);
    });

    it.each([
      ["a failed search", { artists: [], isError: true, settled: true }, "Search failed"],
      ["an empty settled search", { artists: [], isError: false, settled: true }, "No artists found"],
    ])("reports %s in the status line", (_name, result, status) => {
      useArtistSearchMock.mockReturnValue(result);
      renderWithArtists();

      fireEvent.change(screen.getByRole("textbox", { name: "Search" }), { target: { value: "zzz" } });

      expect(screen.getByRole("status")).toHaveTextContent(status);
    });

    it("queries the artist backend given by artistSearchBaseUrl", () => {
      const artistBaseUrl = () => "https://grow.example.com";
      renderWithArtists({ artistSearchBaseUrl: artistBaseUrl });

      fireEvent.change(screen.getByRole("textbox", { name: "Search" }), { target: { value: "taylor" } });

      expect(useArtistSearchMock).toHaveBeenLastCalledWith(artistBaseUrl, "taylor");
    });

    it("falls back to getBackendBaseUrl when no artist base url is given", () => {
      renderWithArtists();

      expect(useArtistSearchMock).toHaveBeenLastCalledWith(getBackendBaseUrl, "");
    });

    it("shows no Artists group and keeps the genre-only label when artistSearch is false", () => {
      renderView();

      fireEvent.change(screen.getByRole("textbox", { name: "Search a genre" }), { target: { value: "taylor" } });

      expect(screen.queryByText("Artists")).not.toBeInTheDocument();
      expect(useArtistSearchMock).toHaveBeenLastCalledWith(getBackendBaseUrl, "");
    });
  });

  describe("artist panel", () => {
    const suggestion = {
      uuid: "11111111-1111-1111-1111-111111111111",
      name: "Band",
      disambiguation: null,
      type: "group",
      country: "GB",
      beginYear: 1994,
      endYear: null,
      matchedAlias: null,
      recordingCount: 3,
    };
    const member = { uuid: "33333333-3333-3333-3333-333333333333", name: "Alice" };
    const detailed = (uuid: string, name: string) => ({
      uuid,
      name,
      musicbrainzArtistId: "22222222-2222-2222-2222-222222222222",
      type: "group",
      country: "GB",
      beginYear: 1994,
      endYear: null,
      ended: false,
      links: [],
      members: uuid === suggestion.uuid ? [{ artist: member, beginYear: 1994, endYear: null, ended: false, roles: [] }] : [],
      memberOf: [],
      albums: [],
      tracksCount: 0,
      image: null,
    });
    const names: Record<string, string> = { [suggestion.uuid]: suggestion.name, [member.uuid]: member.name };

    beforeEach(() => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: [
          makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } }),
          makePlaylist({ uuid: "gp2", name: "Blues", criteria: { uuid: "c2", name: "Blues" } }),
        ],
        isPending: false,
      });
      useArtistSearchMock.mockReturnValue({ artists: [suggestion], isError: false, settled: true });
      useArtistMock.mockImplementation((uuid: string | null) =>
        uuid === null ? { status: "idle" } : { status: "success", artist: detailed(uuid, names[uuid]) },
      );
    });

    const baseProps = () => ({
      scope: "me" as const,
      handleGenreCreationAction: vi.fn(),
      handleGenreRenameAction: vi.fn(),
      getBackendBaseUrl,
      viewMode: "wheel" as const,
    });
    const wheelProps = () => treeWheelPropsMock.mock.calls.at(-1)?.[0];
    const pickSuggestion = () => {
      fireEvent.change(screen.getByRole("textbox", { name: "Search" }), { target: { value: "band" } });
      fireEvent.click(screen.getByRole("button", { name: /Band/ }));
    };

    it("uses song sizing while artist details are loading and keeps host controls", () => {
      useArtistMock.mockReturnValue({ status: "loading" });
      render(<GenreTreeView {...baseProps()} artistUuid={suggestion.uuid} floatingControlsLeading={<span>Host control</span>} />);

      expect(wheelProps().sizeMetric).toBe("songs");
      expect(wheelProps().floatingControlsLeading.props.children[0]).toEqual(<span>Host control</span>);
      expect(wheelProps().floatingControlsLeading.props.children[1]).toBe(false);
    });

    it("opens the picked artist's panel, notifies the host, and closes", () => {
      const onArtistSelect = vi.fn();
      render(<GenreTreeView {...baseProps()} onArtistSelect={onArtistSelect} />);

      expect(wheelProps().overlayPanel).toBeUndefined();
      pickSuggestion();

      expect(wheelProps().overlayPanel.title).toBe("Band");
      expect(onArtistSelect).toHaveBeenCalledWith(suggestion);

      act(() => wheelProps().overlayPanel.onClose());
      expect(wheelProps().overlayPanel).toBeUndefined();
    });

    it("loads the artist from artistSearchBaseUrl, falling back to getBackendBaseUrl", () => {
      const artistBaseUrl = () => "https://grow.example.com";
      render(<GenreTreeView {...baseProps()} artistSearchBaseUrl={artistBaseUrl} />);
      pickSuggestion();
      expect(useArtistMock).toHaveBeenLastCalledWith(suggestion.uuid, artistBaseUrl);

      cleanup();
      render(<GenreTreeView {...baseProps()} />);
      expect(useArtistMock).toHaveBeenLastCalledWith(null, getBackendBaseUrl);
    });

    it("keeps genre and artist mutually exclusive when uncontrolled", () => {
      render(<GenreTreeView {...baseProps()} />);
      act(() => wheelProps().onSelectedNodeChange({ id: "gp1" }));
      expect(wheelProps().selectedNodeId).toBe("gp1");

      pickSuggestion();
      expect(wheelProps().selectedNodeId).toBeNull();
      expect(wheelProps().overlayPanel.title).toBe("Band");

      act(() => wheelProps().onSelectedNodeChange({ id: "gp2" }));
      expect(wheelProps().selectedNodeId).toBe("gp2");
      expect(wheelProps().overlayPanel).toBeUndefined();
    });

    it("clears the artist when a genre is picked from the search", () => {
      render(<GenreTreeView {...baseProps()} />);
      pickSuggestion();

      fireEvent.change(screen.getByRole("textbox", { name: "Search" }), { target: { value: "Jaz" } });
      fireEvent.click(screen.getByRole("button", { name: "Jazz" }));

      expect(wheelProps().selectedNodeId).toBe("gp1");
      expect(wheelProps().overlayPanel).toBeUndefined();
    });

    it("follows a controlled artistUuid and keeps it as a filter while a genre is selected", () => {
      const onArtistUuidChange = vi.fn();
      const onSelectedNodeIdChange = vi.fn();
      const props: GenreTreeViewProps = {
        ...baseProps(),
        selectedNodeId: "gp1",
        onSelectedNodeIdChange,
        artistUuid: null,
        onArtistUuidChange,
      };
      const { rerender } = render(<GenreTreeView {...props} />);

      pickSuggestion();
      expect(onSelectedNodeIdChange).toHaveBeenCalledWith(null);
      expect(onArtistUuidChange).toHaveBeenCalledWith(suggestion.uuid);
      expect(wheelProps().overlayPanel).toBeUndefined();

      rerender(<GenreTreeView {...props} selectedNodeId={null} artistUuid={suggestion.uuid} />);
      expect(wheelProps().overlayPanel.title).toBe("Band");

      onArtistUuidChange.mockClear();
      onSelectedNodeIdChange.mockClear();
      act(() => wheelProps().onSelectedNodeChange({ id: "gp2" }));
      expect(onArtistUuidChange).not.toHaveBeenCalled();
      expect(onSelectedNodeIdChange).toHaveBeenCalledWith("gp2");

      rerender(<GenreTreeView {...props} selectedNodeId="gp2" artistUuid={suggestion.uuid} />);
      expect(wheelProps().overlayPanel).toBeUndefined();
      expect(screen.getByRole("button", { name: "Clear artist filter Band" })).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "Clear artist filter Band" }));
      expect(onArtistUuidChange).toHaveBeenCalledWith(null);
    });

    it("reopens the artist panel from the filter chip by clearing the selected genre", () => {
      const onSelectedNodeIdChange = vi.fn();
      useArtistMock.mockReturnValue({ status: "success", artist: { name: "Band", members: [], albums: [], links: [] } });
      render(
        <GenreTreeView
          {...baseProps()}
          selectedNodeId="gp1"
          onSelectedNodeIdChange={onSelectedNodeIdChange}
          artistUuid={suggestion.uuid}
          onArtistUuidChange={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Show artist Band" }));
      expect(onSelectedNodeIdChange).toHaveBeenCalledWith(null);
    });

    it("lets a host overlayPanel take precedence", () => {
      const overlayPanel = { title: "About", content: "x", onClose: vi.fn() };
      render(<GenreTreeView {...baseProps()} overlayPanel={overlayPanel} artistUuid={suggestion.uuid} />);

      expect(wheelProps().overlayPanel).toBe(overlayPanel);
    });

    it("switches the panel to a member from its default name button", () => {
      render(<GenreTreeView {...baseProps()} />);
      pickSuggestion();

      const { unmount } = render(<>{wheelProps().overlayPanel.content}</>);
      fireEvent.click(screen.getByRole("button", { name: "Alice" }));
      unmount();

      expect(wheelProps().overlayPanel.title).toBe("Alice");
    });

    it("renders a special-purpose member as plain text by default", () => {
      const unknown = { uuid: "44444444-4444-4444-4444-444444444444", name: "[unknown]", isSpecialPurpose: true };
      useArtistMock.mockReturnValue({
        status: "success",
        artist: {
          ...detailed(suggestion.uuid, suggestion.name),
          members: [{ artist: unknown, beginYear: null, endYear: null, ended: false, roles: [] }],
        },
      });
      render(<GenreTreeView {...baseProps()} artistUuid={suggestion.uuid} />);

      render(<>{wheelProps().overlayPanel.content}</>);
      expect(screen.getByText("[unknown]")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "[unknown]" })).not.toBeInTheDocument();
    });

    it("renders member names through the host's renderArtistLink", () => {
      render(
        <GenreTreeView
          {...baseProps()}
          artistUuid={suggestion.uuid}
          renderArtistLink={(artist) => <a href={`/artists/${artist.uuid}`}>{artist.name}</a>}
        />,
      );

      render(<>{wheelProps().overlayPanel.content}</>);
      expect(screen.getByRole("link", { name: "Alice" })).toHaveAttribute("href", `/artists/${member.uuid}`);
    });

    it("starts each artist compact", () => {
      render(<GenreTreeView {...baseProps()} />);
      pickSuggestion();

      act(() => wheelProps().overlayPanel.onExpandedChange(true));
      expect(wheelProps().overlayPanel.expanded).toBe(true);
      act(() => wheelProps().overlayPanel.onExpandedChange(false));
      expect(wheelProps().overlayPanel.expanded).toBe(false);
      act(() => wheelProps().overlayPanel.onExpandedChange(true));

      const { unmount } = render(<>{wheelProps().overlayPanel.content}</>);
      fireEvent.click(screen.getByRole("button", { name: "Alice" }));
      unmount();

      expect(wheelProps().overlayPanel.expanded).toBe(false);
    });

    it("shows the artist's name in the search field, whose clear button closes it", () => {
      const onArtistUuidChange = vi.fn();
      render(<GenreTreeView {...baseProps()} artistUuid={suggestion.uuid} onArtistUuidChange={onArtistUuidChange} />);

      expect(wheelProps().overlayPanel).toMatchObject({ title: "Band", hideTitle: true, hideClose: true });
      expect(screen.getByRole("textbox", { name: "Search" })).toHaveValue("Band");

      fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
      expect(onArtistUuidChange).toHaveBeenCalledWith(null);
    });

    it("leaves a host overlayPanel's header and the search field alone", () => {
      const overlayPanel = { title: "About", content: "x", onClose: vi.fn() };
      render(<GenreTreeView {...baseProps()} overlayPanel={overlayPanel} artistUuid={suggestion.uuid} />);

      expect(wheelProps().overlayPanel).not.toHaveProperty("hideClose");
      expect(screen.getByRole("textbox", { name: "Search" })).toHaveValue("");
    });

    it("drives the artist panel from the edge tab", () => {
      render(
        <GenreTreeView {...baseProps()} placement="regions" onCollapsedChange={vi.fn()} artistUuid={suggestion.uuid} />,
      );

      expect(screen.getByRole("button", { name: "Hide panel" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Extend panel" }));
      expect(wheelProps().overlayPanel).toMatchObject({ expanded: true, hideExpandButton: true });
    });

    it("follows a controlled artistExpanded", () => {
      const onArtistExpandedChange = vi.fn();
      const props: GenreTreeViewProps = {
        ...baseProps(),
        artistUuid: suggestion.uuid,
        artistExpanded: false,
        onArtistExpandedChange,
      };
      const { rerender } = render(<GenreTreeView {...props} />);

      act(() => wheelProps().overlayPanel.onExpandedChange(true));
      expect(onArtistExpandedChange).toHaveBeenCalledWith(true);
      expect(wheelProps().overlayPanel.expanded).toBe(false);

      rerender(<GenreTreeView {...props} artistExpanded />);
      expect(wheelProps().overlayPanel.expanded).toBe(true);
    });
  });
});
