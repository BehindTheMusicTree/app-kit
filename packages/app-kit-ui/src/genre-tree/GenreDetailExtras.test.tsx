import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { render } from "../test-utils";

const { useFetchGenreOverviewMock, tracksPropsMock } = vi.hoisted(() => ({
  useFetchGenreOverviewMock: vi.fn(),
  tracksPropsMock: vi.fn(),
}));

vi.mock("@behindthemusictree/app-kit/genre-tree", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useFetchGenreOverview: () => useFetchGenreOverviewMock(),
}));
vi.mock("./GenrePlaylistTracks", () => ({
  GenrePlaylistTracks: (props: unknown) => {
    tracksPropsMock(props);
    return <div data-testid="genre-playlist-tracks" />;
  },
}));

import { GenreDetailExtras, type GenreDetailExtrasProps } from "./GenreDetailExtras";
import type { CriteriaOverview } from "@behindthemusictree/app-kit/genre-tree";
import { makeGenrePlaylistUuid, makeGenreUuid } from "@behindthemusictree/app-kit/genre-tree/testing";

const overview = { summary: "Default summary text", essentialSongs: [] } as unknown as CriteriaOverview;

const renderExtras = (overrides: Partial<GenreDetailExtrasProps<CriteriaOverview>> = {}) =>
  render(
    <GenreDetailExtras
      genreUuid={makeGenreUuid("g1")}
      genrePlaylist={{ uuid: makeGenrePlaylistUuid("p1"), name: "Jazz" } as GenreDetailExtrasProps<CriteriaOverview>["genrePlaylist"]}
      scope="reference"
      getBackendBaseUrl={() => "https://b"}
      {...overrides}
    />,
  );

describe("GenreDetailExtras", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFetchGenreOverviewMock.mockReturnValue({ data: overview, isPending: false });
  });

  it("keeps the default Summary and Essential tracks sections without slots", () => {
    renderExtras();

    expect(screen.getByText("Default summary text")).toBeInTheDocument();
    expect(screen.getByText("Essential tracks")).toBeInTheDocument();
  });

  describe("text clamp", () => {
    const setOverflow = (overflows: boolean) => {
      vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(overflows ? 100 : 40);
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(40);
    };

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("clamps the summary and description to three lines", () => {
      useFetchGenreOverviewMock.mockReturnValue({ data: { ...overview, description: "A description" }, isPending: false });
      renderExtras();

      expect(screen.getByText("Default summary text")).toHaveClass("line-clamp-3");
      expect(screen.getByText("A description")).toHaveClass("line-clamp-3");
    });

    it("shows no toggle when the text fits", () => {
      setOverflow(false);
      renderExtras();

      expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
    });

    it("expands and collapses an overflowing summary", () => {
      setOverflow(true);
      renderExtras();

      const toggle = screen.getByRole("button", { name: "Show more" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(toggle);
      expect(screen.getByText("Default summary text")).not.toHaveClass("line-clamp-3");
      expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");

      fireEvent.click(screen.getByRole("button", { name: "Show less" }));
      expect(screen.getByText("Default summary text")).toHaveClass("line-clamp-3");
    });
  });

  it("replaces both default sections with the slots, passing the overview", () => {
    const renderSummary = vi.fn(() => <p>Custom summary</p>);
    const renderEssentialTracks = vi.fn(() => <p>Custom essentials</p>);
    renderExtras({ renderSummary, renderEssentialTracks });

    expect(screen.getByText("Custom summary")).toBeInTheDocument();
    expect(screen.getByText("Custom essentials")).toBeInTheDocument();
    expect(screen.queryByText("Default summary text")).not.toBeInTheDocument();
    expect(screen.queryByText("Essential tracks")).not.toBeInTheDocument();
    expect(renderSummary).toHaveBeenCalledWith(overview);
    expect(renderEssentialTracks).toHaveBeenCalledWith(overview);
  });

  it("shows the description only when present", () => {
    useFetchGenreOverviewMock.mockReturnValue({
      data: { ...overview, description: "music genre" },
      isPending: false,
    });
    const { unmount } = renderExtras();
    expect(screen.getByText("music genre")).toBeInTheDocument();
    unmount();

    useFetchGenreOverviewMock.mockReturnValue({ data: { ...overview, description: null }, isPending: false });
    renderExtras();
    expect(screen.queryByText("music genre")).not.toBeInTheDocument();
  });

  it("links the Wikipedia source only with summarySourceUrl, even with renderSummary", () => {
    renderExtras();
    expect(screen.queryByRole("link", { name: /wikipedia/i })).not.toBeInTheDocument();

    useFetchGenreOverviewMock.mockReturnValue({
      data: { ...overview, summarySourceUrl: "https://en.wikipedia.org/wiki/Jazz" },
      isPending: false,
    });
    renderExtras({ renderSummary: () => <p>Custom summary</p> });
    const link = screen.getByRole("link", { name: /wikipedia/i });
    expect(link).toHaveAttribute("href", "https://en.wikipedia.org/wiki/Jazz");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the Wikipedia source inside the default Summary section", () => {
    useFetchGenreOverviewMock.mockReturnValue({
      data: { ...overview, summarySourceUrl: "https://en.wikipedia.org/wiki/Jazz" },
      isPending: false,
    });
    renderExtras();

    const link = screen.getByRole("link", { name: /wikipedia/i });
    expect(link.closest(".gtv-info-panel-children")).toContainElement(screen.getByText("Default summary text"));
  });

  it("forwards the track slots to GenrePlaylistTracks", () => {
    const renderSongLeading = vi.fn();
    const renderSongActions = vi.fn();
    const renderTracksToolbar = vi.fn();
    renderExtras({ renderSongLeading, renderSongActions, renderTracksToolbar });

    expect(tracksPropsMock.mock.calls[0][0]).toMatchObject({
      renderSongLeading,
      renderSongActions,
      renderTracksToolbar,
    });
  });
});
