import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { render } from "../test-utils";

const { useFetchGenreDetailMock } = vi.hoisted(() => ({ useFetchGenreDetailMock: vi.fn() }));

vi.mock("@behindthemusictree/app-kit/genre-tree", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useFetchGenreDetail: () => useFetchGenreDetailMock(),
}));
vi.mock("./GenreInfoPanelBody", () => ({
  GenreInfoPanelBody: ({ band, family }: { band: { onZoomIn?: () => void }; family: React.ReactNode }) => (
    <div>
      {family}
      {band.onZoomIn && <button onClick={band.onZoomIn}>Focus</button>}
    </div>
  ),
}));
vi.mock("./playlist-tree/useGenrePlaylistPlayback", () => ({
  useGenrePlaylistPlayback: () => ({ playingNodeId: null, play: vi.fn() }),
}));

import { GenreDetailPanel } from "./GenreDetailPanel";
import { makeGenrePlaylistUuid, makeGenreUuid } from "@behindthemusictree/app-kit/genre-tree/testing";

const root = { uuid: makeGenreUuid("root"), name: "World music", wikidataId: "Q1" };
const detail = {
  uuid: makeGenreUuid("france"),
  name: "Music of France",
  wikidataId: "Q672134",
  parent: { uuid: makeGenreUuid("west"), name: "Music of Western Europe" },
  ascendants: [
    { ascendant: { uuid: makeGenreUuid("west"), name: "Music of Western Europe" }, degree: 1 },
    { ascendant: root, degree: 3 },
    { ascendant: { uuid: makeGenreUuid("europe"), name: "Music of Europe" }, degree: 2 },
  ],
  root,
  children: [{ uuid: makeGenreUuid("brittany"), name: "Music of Brittany" }],
  criteriaPlaylist: { uuid: makeGenrePlaylistUuid("p"), name: "Music of France", genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { all: 4 } },
  catalogue: { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { all: 4 } },
  tracksCount: 4,
};

const renderPanel = (props: Partial<React.ComponentProps<typeof GenreDetailPanel>> = {}) =>
  render(
    <GenreDetailPanel
      genreUuid={detail.uuid}
      scope="reference"
      getBackendBaseUrl={() => "https://b"}
      onClose={vi.fn()}
      onSelectGenre={vi.fn()}
      {...props}
    />,
  );

describe("GenreDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFetchGenreDetailMock.mockReturnValue({ data: detail, isPending: false, isError: false });
  });

  it("shows a skeleton while the genre loads", () => {
    useFetchGenreDetailMock.mockReturnValue({ data: undefined, isPending: true, isError: false });
    const onClose = vi.fn();
    renderPanel({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();

    expect(screen.getByTestId("genre-detail-panel-skeleton")).toBeInTheDocument();
  });

  it("shows an error instead of an empty panel when the genre fails to load", () => {
    useFetchGenreDetailMock.mockReturnValue({ data: undefined, isPending: false, isError: true });
    renderPanel();

    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("hangs the host's edge tab off the panel", () => {
    const onClick = vi.fn();
    renderPanel({ edgeTab: { edge: { label: "Hide panel", onClick }, center: null } });

    fireEvent.click(screen.getByRole("button", { name: "Hide panel" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the genre's name", () => {
    renderPanel();

    expect(screen.getAllByText("Music of France").length).toBeGreaterThan(0);
  });

  it("selects a family genre when its chip is clicked", () => {
    const onSelectGenre = vi.fn();
    renderPanel({ onSelectGenre });

    fireEvent.click(screen.getByRole("button", { name: /Music of Brittany/ }));

    expect(onSelectGenre).toHaveBeenCalledWith(makeGenreUuid("brittany"));
  });


  it("opens a genre without a playlist and navigates by genre UUID", () => {
    useFetchGenreDetailMock.mockReturnValue({ data: { ...detail, criteriaPlaylist: null }, isPending: false, isError: false });
    const onSelectGenre = vi.fn();
    renderPanel({ onSelectGenre });
    expect(screen.getByRole("complementary", { name: detail.name })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Music of Brittany/ }));
    expect(onSelectGenre).toHaveBeenCalledWith(makeGenreUuid("brittany"));
  });

  it("replaces previous genre content with a closable loading state on navigation", () => {
    const props = { genreUuid: detail.uuid, scope: "reference" as const, getBackendBaseUrl: () => "https://b", onClose: vi.fn(), onSelectGenre: vi.fn() };
    const view = render(<GenreDetailPanel {...props} />);
    useFetchGenreDetailMock.mockReturnValue({ data: undefined, isPending: true, isError: false });
    view.rerender(<GenreDetailPanel {...props} genreUuid={makeGenreUuid("brittany")} />);
    expect(screen.queryByText(detail.name)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByTestId("genre-detail-panel-skeleton")).toBeInTheDocument();
  });

  it("offers Focus only when onZoomIn is given", () => {
    const onZoomIn = vi.fn();
    const { unmount } = renderPanel({ onZoomIn });
    fireEvent.click(screen.getByRole("button", { name: "Focus" }));
    expect(onZoomIn).toHaveBeenCalledTimes(1);
    unmount();

    renderPanel();
    expect(screen.queryByRole("button", { name: "Focus" })).not.toBeInTheDocument();
  });
});
