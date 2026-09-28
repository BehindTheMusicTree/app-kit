import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { z } from "zod";

const {
  useListFullGenrePlaylistsMock,
  useFetchGenreOverviewMock,
  prefetchGenreOverviewMock,
  treePerRootPropsMock,
  treeWheelPropsMock,
  treeWheelRadialPopCorePropsMock,
} = vi.hoisted(() => ({
  useListFullGenrePlaylistsMock: vi.fn(),
  useFetchGenreOverviewMock: vi.fn(),
  prefetchGenreOverviewMock: vi.fn(),
  treePerRootPropsMock: vi.fn(),
  treeWheelPropsMock: vi.fn(),
  treeWheelRadialPopCorePropsMock: vi.fn(),
}));

vi.mock("./useGenrePlaylist", () => ({
  useListFullGenrePlaylists: () => useListFullGenrePlaylistsMock(),
}));

vi.mock("./useGenre", () => ({
  useFetchGenreOverview: (id: string | null) => useFetchGenreOverviewMock(id),
  usePrefetchGenreOverview: () => prefetchGenreOverviewMock,
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

import { GenreTreeView, type GenreTreeViewProps } from "./GenreTreeView";

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
    criteria: { uuid: "c1", name: "Jazz" },
    ...overrides,
  };
}

function renderView(overrides: Partial<GenreTreeViewProps> = {}) {
  const props: GenreTreeViewProps = {
    scope: "me",
    handleGenreCreationAction: vi.fn(),
    handleGenreRenameAction: vi.fn(),
    getBackendBaseUrl,
    ...overrides,
  };
  render(<GenreTreeView {...props} />);
  return props;
}

describe("GenreTreeView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: { results: [] },
      isPending: false,
    });
    useFetchGenreOverviewMock.mockReturnValue({ data: undefined, isPending: false });
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
      data: {
        results: [
          makePlaylist({ uuid: "gp1", root: { uuid: "root1" } }),
          makePlaylist({ uuid: "gp2", root: { uuid: "root2" } }),
        ],
      },
      isPending: false,
    });
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));

    expect(screen.getAllByTestId("tree-per-root")).toHaveLength(2);
    expect(screen.queryByTestId("tree-wheel")).not.toBeInTheDocument();
  });

  it("switches to wheel view and passes genre playlists through", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: { results: [makePlaylist()] },
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
      data: { results: [makePlaylist()] },
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
      data: { results: [makePlaylist()] },
      isPending: false,
    });
    renderView({ readOnly: true });

    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));
    expect(treePerRootPropsMock.mock.calls[0][0].readOnly).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
    expect(treeWheelPropsMock.mock.calls[0][0].readOnly).toBe(true);
  });

  it("passes reparentingGenreUuid updates through to the tree components", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({
      data: { results: [makePlaylist()] },
      isPending: false,
    });
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));

    expect(
      treePerRootPropsMock.mock.calls[0][0].reparentingGenreUuid,
    ).toBeNull();

    act(() => {
      treePerRootPropsMock.mock.calls[0][0].setReparentingGenreUuid("gp1");
    });

    expect(
      treePerRootPropsMock.mock.calls.at(-1)?.[0].reparentingGenreUuid,
    ).toBe("gp1");
  });

  describe("rotation and toolbar toggles", () => {
    it("default to off and are passed through to the wheel view", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: { results: [makePlaylist()] },
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

      expect(treeWheelPropsMock.mock.calls[0][0].allowWheelRotation).toBe(
        false,
      );
      expect(treeWheelPropsMock.mock.calls[0][0].showToolbar).toBe(false);
    });

    it("toggle on and pass through to the wheel view", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: { results: [makePlaylist()] },
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
      fireEvent.click(screen.getByRole("button", { name: "Rotation" }));
      fireEvent.click(screen.getByRole("button", { name: "Toolbar" }));

      expect(
        treeWheelPropsMock.mock.calls.at(-1)?.[0].allowWheelRotation,
      ).toBe(true);
      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].showToolbar).toBe(
        true,
      );
    });

    it("pass through to the pop-core view", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: {
          results: [
            makePlaylist({
              uuid: "gp1",
              name: "Mainstream Pop",
              root: { uuid: "gp1" },
              parent: null,
            }),
          ],
        },
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Pop/Core" }));
      fireEvent.click(screen.getByRole("button", { name: "Rotation" }));
      fireEvent.click(screen.getByRole("button", { name: "Toolbar" }));

      expect(
        treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0]
          .allowWheelRotation,
      ).toBe(true);
      expect(
        treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0].showToolbar,
      ).toBe(true);
    });

    it("hides the Rotation toggle in stacked view and passes showToolbar through", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: { results: [makePlaylist()] },
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Stacked" }));

      expect(
        screen.queryByRole("button", { name: "Rotation" }),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Toolbar" }));

      expect(treePerRootPropsMock.mock.calls.at(-1)?.[0].showToolbar).toBe(
        true,
      );
    });
  });

  describe("outline view", () => {
    it("switches to the outline view and hides the Rotation toggle", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: {
          results: [
            makePlaylist({
              uuid: "gp1",
              name: "Mainstream Pop",
              root: { uuid: "gp1" },
              parent: null,
            }),
          ],
        },
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Outline" }));

      expect(treeWheelRadialPopCorePropsMock.mock.calls.at(-1)?.[0].outline).toBe(true);
      expect(screen.queryByRole("button", { name: "Rotation" })).not.toBeInTheDocument();
    });

    it("falls back to the wheel view for a controlled outline mode with no 'Mainstream Pop' root", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: { results: [makePlaylist({ root: { uuid: "gp1" } })] },
        isPending: false,
      });
      renderView({ viewMode: "outline" });

      expect(treeWheelRadialPopCorePropsMock).not.toHaveBeenCalled();
      expect(treeWheelPropsMock).toHaveBeenCalled();
    });
  });

  describe("pop-core view", () => {
    it("disables the Pop/Core toggle with an explanatory title when there is no 'Mainstream Pop' root", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: {
          results: [
            makePlaylist({
              uuid: "gp1",
              name: "Rock",
              root: { uuid: "gp1" },
              parent: null,
            }),
          ],
        },
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
        data: {
          results: [
            makePlaylist({
              uuid: "gp1",
              name: "Mainstream Pop",
              root: { uuid: "gp1" },
              parent: null,
            }),
          ],
        },
        isPending: false,
      });
      renderView();

      expect(screen.getByRole("button", { name: "Pop/Core" })).toBeEnabled();
    });

    it("switches to the pop-core view and passes genre playlists through", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: {
          results: [
            makePlaylist({
              uuid: "gp1",
              name: "Mainstream Pop",
              root: { uuid: "gp1" },
              parent: null,
            }),
          ],
        },
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
        data: {
          results: [
            makePlaylist({
              uuid: "gp1",
              name: "Mainstream Pop",
              root: { uuid: "gp1" },
              parent: null,
            }),
          ],
        },
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
      };
      const { rerender } = render(<GenreTreeView {...props} />);

      // Loading finishes on data with no "Mainstream Pop" root while still defaulted to
      // "pop-core" — GenrePlaylistTreeWheelRadialPopCore throws on mount without that root, so
      // it must never be rendered here, not even for the one commit before the corrective effect
      // would otherwise run.
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: {
          results: [
            makePlaylist({
              uuid: "gp1",
              name: "Rock",
              root: { uuid: "gp1" },
              parent: null,
            }),
          ],
        },
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
      };
      const { rerender } = render(<GenreTreeView {...props} />);

      expect(
        screen.getByTestId("genre-tree-wheel-skeleton"),
      ).toBeInTheDocument();

      useListFullGenrePlaylistsMock.mockReturnValue({
        data: {
          results: [
            makePlaylist({
              uuid: "gp1",
              name: "Mainstream Pop",
              root: { uuid: "gp1" },
              parent: null,
            }),
          ],
        },
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
        data: {
          results: [
            makePlaylist({
              uuid: "gp1",
              name: "Mainstream Pop",
              root: { uuid: "gp1" },
              parent: null,
            }),
          ],
        },
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
        data: { results: [makePlaylist()] },
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

  describe("renderExtraDetails", () => {
    function selectGenre(id = "gp1") {
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
      act(() => {
        treeWheelPropsMock.mock.calls.at(-1)?.[0].onNodeClick({ id });
      });
    }

    function renderExtraDetailsFor(id: string) {
      const output = treeWheelPropsMock.mock.calls.at(-1)?.[0].renderExtraDetails({ id });
      render(<>{output}</>);
      return output;
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
        data: {
          results: [
            makePlaylist({ uuid: "gp1", criteria: { uuid: "c1", name: "Jazz" } }),
            makePlaylist({ uuid: "gp2", criteria: { uuid: "c2", name: "Blues" } }),
            makePlaylist({ uuid: "gp3", criteria: null }),
          ],
        },
        isPending: false,
      });
    });

    it("fetches the overview for the rendered node's criteria uuid", () => {
      renderView();
      selectGenre();

      renderExtraDetailsFor("gp1");

      expect(useFetchGenreOverviewMock).toHaveBeenCalledWith("c1");
    });

    it("returns null for a node with no associated criteria", () => {
      renderView();
      selectGenre("gp3");

      expect(renderExtraDetailsFor("gp3")).toBeNull();
    });

    it("renders essential tracks and consumer detail extras", () => {
      mockOverview({
        c1: {
          name: "Jazz",
          essentialTracks: [
            { uuid: "t1", title: "Track One", artists: null },
            { uuid: "t2", title: "Track Two", artists: null },
          ],
        },
      });
      renderView({
        renderGenreDetailExtras: (overview) => <p>Extra for {overview.name}</p>,
      });
      selectGenre();

      renderExtraDetailsFor("gp1");

      expect(screen.getByText("Track One")).toBeInTheDocument();
      expect(screen.getByText("Track Two")).toBeInTheDocument();
      expect(screen.getByText("Extra for Jazz")).toBeInTheDocument();
    });

    it("omits the essential tracks section when the scope's overview has none (e.g. hear)", () => {
      mockOverview({ c1: { summary: "Loud guitars" } });
      renderView();
      selectGenre();

      renderExtraDetailsFor("gp1");

      expect(screen.getByText("Loud guitars")).toBeInTheDocument();
      expect(screen.queryByText("Essential tracks")).not.toBeInTheDocument();
    });

    it("renders the genre summary", () => {
      mockOverview({ c1: { summary: "Improvised music with swung rhythms." } });
      renderView();
      selectGenre();

      renderExtraDetailsFor("gp1");

      expect(screen.getByText("Improvised music with swung rhythms.")).toBeInTheDocument();
    });

    it("renders the overview of whichever node the panel shows (e.g. info-panel chip navigation)", () => {
      mockOverview({ c1: { summary: "Jazz summary" }, c2: { summary: "Blues summary" } });
      renderView();
      selectGenre("gp1");

      renderExtraDetailsFor("gp2");

      expect(screen.getByText("Blues summary")).toBeInTheDocument();
      expect(screen.queryByText("Jazz summary")).not.toBeInTheDocument();
    });

    it("renders a skeleton while the overview is loading", () => {
      useFetchGenreOverviewMock.mockReturnValue({ data: undefined, isPending: true });
      renderView();
      selectGenre();

      renderExtraDetailsFor("gp1");

      expect(screen.getByTestId("genre-detail-extras-skeleton")).toBeInTheDocument();
    });

    it("renders nothing when the overview failed to load", () => {
      renderView();
      selectGenre();

      renderExtraDetailsFor("gp1");

      expect(screen.queryByText("Summary")).not.toBeInTheDocument();
    });

    it("renders blank summary and essential tracks placeholders when there is no summary, and no essential tracks", () => {
      mockOverview({ c1: { essentialTracks: [] } });
      renderView();
      selectGenre();

      renderExtraDetailsFor("gp1");

      expect(screen.getByText("Summary")).toBeInTheDocument();
      expect(screen.getByText("Essential tracks")).toBeInTheDocument();
      expect(screen.getAllByText("—")).toHaveLength(2);
    });

    // Perf regression guard: a selection must not hand the tree a new renderExtraDetails, and the
    // tree must not own the overview fetch — otherwise every fetch state change re-renders it.
    it("keeps renderExtraDetails stable across selections and never fetches from the tree's render", () => {
      renderView();
      fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
      const before = treeWheelPropsMock.mock.calls.at(-1)?.[0].renderExtraDetails;

      act(() => {
        treeWheelPropsMock.mock.calls.at(-1)?.[0].onNodeClick({ id: "gp1" });
      });
      act(() => {
        treeWheelPropsMock.mock.calls.at(-1)?.[0].onNodeClick({ id: "gp2" });
      });

      expect(treeWheelPropsMock.mock.calls.at(-1)?.[0].renderExtraDetails).toBe(before);
      expect(useFetchGenreOverviewMock).not.toHaveBeenCalled();
    });
  });

  describe("hover prefetch", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: {
          results: [
            makePlaylist({ uuid: "gp1", criteria: { uuid: "c1", name: "Jazz" } }),
            makePlaylist({ uuid: "gp2", criteria: { uuid: "c2", name: "Blues" } }),
            makePlaylist({ uuid: "gp3", criteria: null }),
          ],
        },
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
        data: { results: [makePlaylist({ uuid: "gp1", name: "Mainstream Pop", parent: null })] },
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
        data: { results: [makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } })] },
        isPending: false,
      });
      useFetchGenreOverviewMock.mockImplementation((id: string | null) =>
        id === "c1"
          ? {
              data: { uuid: "c1", name: "Jazz", summary: "Improvised music with swung rhythms.", essentialTracks: [] },
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
      const output = treeWheelPropsMock.mock.calls.at(-1)?.[0].renderExtraDetails({
        id: "gp1",
      });
      render(<>{output}</>);

      expect(screen.getByText("Improvised music with swung rhythms.")).toBeInTheDocument();
    });

    it("passes the selected node id through to the active tree renderer for highlighting", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: { results: [makePlaylist({ uuid: "gp1", name: "Jazz", criteria: { uuid: "c1", name: "Jazz" } })] },
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
  });
});
