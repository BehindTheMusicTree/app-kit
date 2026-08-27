import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { z } from "zod";

const {
  useListFullGenrePlaylistsMock,
  useLoadExampleTreeGenreMock,
  loadTreeMutateMock,
  treePerRootPropsMock,
  treeWheelPropsMock,
  treeWheelRadialPopCorePropsMock,
} = vi.hoisted(() => ({
  useListFullGenrePlaylistsMock: vi.fn(),
  useLoadExampleTreeGenreMock: vi.fn(),
  loadTreeMutateMock: vi.fn(),
  treePerRootPropsMock: vi.fn(),
  treeWheelPropsMock: vi.fn(),
  treeWheelRadialPopCorePropsMock: vi.fn(),
}));

vi.mock("./useGenrePlaylist", () => ({
  useListFullGenrePlaylists: () => useListFullGenrePlaylistsMock(),
}));

vi.mock("./useGenre", () => ({
  useLoadExampleTreeGenre: () => useLoadExampleTreeGenreMock(),
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

vi.mock("./GenreTreeSkeleton", () => ({
  GenreTreeSkeleton: () => <div data-testid="genre-tree-skeleton" />,
}));

import { GenreTreeView, type GenreTreeViewProps } from "./GenreTreeView";
import type { TrackBase } from "./schemas/track/base";
import type { CriteriaPlaylistDetailedLike } from "./models/TrackListOrigin";

const getBackendBaseUrl = () => "https://backend.example.com";
const schema = z.custom<CriteriaPlaylistDetailedLike<TrackBase>>();

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

function renderView(overrides: Partial<GenreTreeViewProps<TrackBase>> = {}) {
  const props: GenreTreeViewProps<TrackBase> = {
    scope: "me",
    handleGenreCreationAction: vi.fn(),
    handleGenreRenameAction: vi.fn(),
    getBackendBaseUrl,
    criteriaPlaylistDetailedSchema: schema,
    ...overrides,
  };
  render(<GenreTreeView {...props} />);
  return props;
}

describe("GenreTreeView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useListFullGenrePlaylistsMock.mockReturnValue({ data: { results: [] }, isPending: false });
    useLoadExampleTreeGenreMock.mockReturnValue({ mutate: loadTreeMutateMock, isPending: false });
  });

  it("shows the skeleton while the genre playlists are loading", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({ data: undefined, isPending: true });
    renderView();

    expect(screen.getByTestId("genre-tree-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stacked" })).not.toBeInTheDocument();
  });

  it("shows the skeleton while the example tree is loading", () => {
    useLoadExampleTreeGenreMock.mockReturnValue({ mutate: loadTreeMutateMock, isPending: true });
    renderView();

    expect(screen.getByTestId("genre-tree-skeleton")).toBeInTheDocument();
  });

  it("shows the load-example button and 'me' wording when there are no genres yet", () => {
    renderView({ scope: "me" });

    expect(screen.getByRole("button", { name: /Load the example tree genre/ })).toBeInTheDocument();
  });

  it("shows the reference wording when scope is reference", () => {
    renderView({ scope: "reference" });

    expect(screen.getByRole("button", { name: /Load the reference tree genre/ })).toBeInTheDocument();
  });

  it("calls loadTreeMutation.mutate when the load button is clicked", () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: /Load the example tree genre/ }));

    expect(loadTreeMutateMock).toHaveBeenCalled();
  });

  it("hides the load-example button once at least one genre exists", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({ data: { results: [makePlaylist()] }, isPending: false });
    renderView();

    expect(screen.queryByRole("button", { name: /Load the example tree genre/ })).not.toBeInTheDocument();
  });

  it("calls handleGenreCreationAction(null) when Add root is clicked", () => {
    const handleGenreCreationAction = vi.fn();
    renderView({ handleGenreCreationAction });

    fireEvent.click(screen.getByRole("button", { name: /Add root/ }));

    expect(handleGenreCreationAction).toHaveBeenCalledWith(null);
  });

  it("renders stacked view by default, grouping playlists by root", () => {
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

    expect(screen.getAllByTestId("tree-per-root")).toHaveLength(2);
    expect(screen.queryByTestId("tree-wheel")).not.toBeInTheDocument();
  });

  it("switches to wheel view and passes genre playlists through", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({ data: { results: [makePlaylist()] }, isPending: false });
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

    expect(screen.getByTestId("tree-wheel")).toBeInTheDocument();
    expect(screen.queryByTestId("tree-per-root")).not.toBeInTheDocument();
    expect(treeWheelPropsMock.mock.calls[0][0].genrePlaylists).toEqual([makePlaylist()]);
  });

  it("defaults genrePlaylists to an empty array in wheel view when data is undefined", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({ data: undefined, isPending: false });
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Wheel" }));

    expect(treeWheelPropsMock.mock.calls[0][0].genrePlaylists).toEqual([]);
  });

  it("switches back to stacked view", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({ data: { results: [makePlaylist()] }, isPending: false });
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));

    expect(screen.getByTestId("tree-per-root")).toBeInTheDocument();
  });

  it("hides the Add root and load-tree buttons when readOnly", () => {
    renderView({ readOnly: true });

    expect(screen.queryByRole("button", { name: /Add root/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Load the example tree genre/ })).not.toBeInTheDocument();
  });

  it("passes readOnly through to the tree components", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({ data: { results: [makePlaylist()] }, isPending: false });
    renderView({ readOnly: true });

    expect(treePerRootPropsMock.mock.calls[0][0].readOnly).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Wheel" }));
    expect(treeWheelPropsMock.mock.calls[0][0].readOnly).toBe(true);
  });

  it("passes reparentingGenreUuid updates through to the tree components", () => {
    useListFullGenrePlaylistsMock.mockReturnValue({ data: { results: [makePlaylist()] }, isPending: false });
    renderView();

    expect(treePerRootPropsMock.mock.calls[0][0].reparentingGenreUuid).toBeNull();

    act(() => {
      treePerRootPropsMock.mock.calls[0][0].setReparentingGenreUuid("gp1");
    });
  });

  describe("pop-core view", () => {
    it("disables the Pop/Core toggle with an explanatory title when there is no 'Mainstream Pop' root", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: { results: [makePlaylist({ uuid: "gp1", name: "Rock", root: { uuid: "gp1" }, parent: null })] },
        isPending: false,
      });
      renderView();

      const popCoreButton = screen.getByRole("button", { name: "Pop/Core" });
      expect(popCoreButton).toBeDisabled();
      expect(popCoreButton).toHaveAttribute("title", "This genre tree has no 'Mainstream Pop' root yet");
    });

    it("enables the Pop/Core toggle when a 'Mainstream Pop' root exists", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: {
          results: [makePlaylist({ uuid: "gp1", name: "Mainstream Pop", root: { uuid: "gp1" }, parent: null })],
        },
        isPending: false,
      });
      renderView();

      expect(screen.getByRole("button", { name: "Pop/Core" })).toBeEnabled();
    });

    it("switches to the pop-core view and passes genre playlists through", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: {
          results: [makePlaylist({ uuid: "gp1", name: "Mainstream Pop", root: { uuid: "gp1" }, parent: null })],
        },
        isPending: false,
      });
      renderView();

      fireEvent.click(screen.getByRole("button", { name: "Pop/Core" }));

      expect(screen.getByTestId("tree-wheel-radial-pop-core")).toBeInTheDocument();
      expect(screen.queryByTestId("tree-per-root")).not.toBeInTheDocument();
      expect(treeWheelRadialPopCorePropsMock.mock.calls[0][0].genrePlaylists).toEqual([
        makePlaylist({ uuid: "gp1", name: "Mainstream Pop", root: { uuid: "gp1" }, parent: null }),
      ]);
    });

    it("passes readOnly through to the pop-core tree component", () => {
      useListFullGenrePlaylistsMock.mockReturnValue({
        data: {
          results: [makePlaylist({ uuid: "gp1", name: "Mainstream Pop", root: { uuid: "gp1" }, parent: null })],
        },
        isPending: false,
      });
      renderView({ readOnly: true });

      fireEvent.click(screen.getByRole("button", { name: "Pop/Core" }));

      expect(treeWheelRadialPopCorePropsMock.mock.calls[0][0].readOnly).toBe(true);
    });
  });
});
