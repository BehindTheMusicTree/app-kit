import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
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

const overview = { summary: "Default summary text", essentialTracks: [] } as unknown as CriteriaOverview;

const renderExtras = (overrides: Partial<GenreDetailExtrasProps<CriteriaOverview>> = {}) =>
  render(
    <GenreDetailExtras
      genreUuid="g1"
      genrePlaylist={{ uuid: "p1", name: "Jazz" } as GenreDetailExtrasProps<CriteriaOverview>["genrePlaylist"]}
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

  it("forwards the track slots to GenrePlaylistTracks", () => {
    const renderRecordingLeading = vi.fn();
    const renderRecordingActions = vi.fn();
    const renderTracksToolbar = vi.fn();
    renderExtras({ renderRecordingLeading, renderRecordingActions, renderTracksToolbar });

    expect(tracksPropsMock.mock.calls[0][0]).toMatchObject({
      renderRecordingLeading,
      renderRecordingActions,
      renderTracksToolbar,
    });
  });
});
