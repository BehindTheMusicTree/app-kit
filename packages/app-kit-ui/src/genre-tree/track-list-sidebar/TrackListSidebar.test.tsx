import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "../../test-utils";
import { TrackNounProvider } from "@behindthemusictree/app-kit/track-noun";

const { useTrackListMock } = vi.hoisted(() => ({
  useTrackListMock: vi.fn(),
}));

vi.mock("@behindthemusictree/app-kit/genre-tree", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTrackList: useTrackListMock,
}));

vi.mock("./TrackItem", () => ({
  default: ({ track, renderArtistLink }: { track: { uuid: string; title: string }; renderArtistLink?: unknown }) => (
    <span data-has-artist-link={String(!!renderArtistLink)}>{track.title}</span>
  ),
}));

import TrackListSidebar from "./TrackListSidebar";
import { TrackListOriginType } from "@behindthemusictree/app-kit/genre-tree";

function makeTrackList(overrides: Record<string, unknown> = {}) {
  return {
    origin: { label: "My Playlist", type: TrackListOriginType.GENRE_PLAYLIST },
    tracks: [
      { uuid: "t1", title: "Song One" },
      { uuid: "t2", title: "Song Two" },
    ],
    total: 2,
    nextPage: null,
    ...overrides,
  };
}

describe("TrackListSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when there is no track list", () => {
    useTrackListMock.mockReturnValue({ trackList: null });

    const { container } = render(<TrackListSidebar />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the origin label and track items", () => {
    useTrackListMock.mockReturnValue({ trackList: makeTrackList() });

    render(<TrackListSidebar />);

    expect(screen.getByText("My Playlist")).toBeInTheDocument();
    expect(screen.getByText("Song One")).toBeInTheDocument();
    expect(screen.getByText("Song Two")).toBeInTheDocument();
  });

  it("shows genre label and pluralized track count", () => {
    useTrackListMock.mockReturnValue({ trackList: makeTrackList() });

    render(<TrackListSidebar />);

    expect(screen.getByText(/Genre • 2 tracks/)).toBeInTheDocument();
    expect(screen.queryByText(/Genre playlist/)).not.toBeInTheDocument();
    expect(screen.getByText(/2 tracks/)).toBeInTheDocument();
  });

  it("shows track playlist label and singular track count for a single track", () => {
    useTrackListMock.mockReturnValue({
      trackList: makeTrackList({
        origin: { label: "Single Track", type: TrackListOriginType.TRACK },
        tracks: [{ uuid: "t1", title: "Only Song" }],
        total: 1,
      }),
    });

    render(<TrackListSidebar />);

    expect(document.querySelector(".info")).toHaveTextContent(/^track playlist • 1 track$/);
  });

  it("uses the noun supplied by the TrackNounProvider", () => {
    useTrackListMock.mockReturnValue({
      trackList: makeTrackList({
        origin: { label: "Single Track", type: TrackListOriginType.TRACK },
        tracks: [{ uuid: "t1", title: "Only Song" }],
        total: 2,
      }),
    });

    render(
      <TrackNounProvider singular="song" plural="songs">
        <TrackListSidebar />
      </TrackNounProvider>,
    );

    expect(document.querySelector(".info")).toHaveTextContent(/^song playlist • 2 songs$/);
  });

  it("labels an artist origin and passes renderArtistLink to each track", () => {
    useTrackListMock.mockReturnValue({
      trackList: makeTrackList({ origin: { label: "Miles Davis", type: TrackListOriginType.ARTIST } }),
    });

    render(<TrackListSidebar renderArtistLink={(artist) => artist.name} />);

    expect(document.querySelector(".info")).toHaveTextContent(/^Artist • 2 tracks$/);
    expect(screen.getByText("Song One")).toHaveAttribute("data-has-artist-link", "true");
  });

  it("shows the playlist total rather than the loaded count", () => {
    useTrackListMock.mockReturnValue({ trackList: makeTrackList({ total: 250 }) });

    render(<TrackListSidebar />);

    expect(screen.getByText(/250 tracks/)).toBeInTheDocument();
  });

  describe("load-more sentinel", () => {
    let observerCallback: IntersectionObserverCallback;
    const observe = vi.fn();
    const disconnect = vi.fn();

    beforeEach(() => {
      vi.stubGlobal(
        "IntersectionObserver",
        vi.fn(function (this: unknown, callback: IntersectionObserverCallback) {
          observerCallback = callback;
          return { observe, disconnect };
        }),
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const intersect = (isIntersecting: boolean) =>
      observerCallback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);

    it("does not observe when there is no next page", () => {
      useTrackListMock.mockReturnValue({ trackList: makeTrackList(), loadMore: vi.fn() });

      render(<TrackListSidebar />);

      expect(observe).not.toHaveBeenCalled();
    });

    it("calls loadMore when the sentinel scrolls into view, and disconnects on unmount", () => {
      const loadMore = vi.fn().mockResolvedValue(undefined);
      useTrackListMock.mockReturnValue({ trackList: makeTrackList({ nextPage: 2 }), loadMore });

      const { unmount } = render(<TrackListSidebar />);
      expect(observe).toHaveBeenCalledTimes(1);

      intersect(false);
      expect(loadMore).not.toHaveBeenCalled();
      intersect(true);
      expect(loadMore).toHaveBeenCalledTimes(1);

      unmount();
      expect(disconnect).toHaveBeenCalled();
    });

    it("logs when loadMore rejects", async () => {
      const error = new Error("boom");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      useTrackListMock.mockReturnValue({
        trackList: makeTrackList({ nextPage: 2 }),
        loadMore: vi.fn().mockRejectedValue(error),
      });

      render(<TrackListSidebar />);
      intersect(true);

      await vi.waitFor(() =>
        expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load more tracks:", error),
      );
      consoleErrorSpy.mockRestore();
    });
  });

  it("defaults to fixed positioning", () => {
    useTrackListMock.mockReturnValue({ trackList: makeTrackList() });

    const { container } = render(<TrackListSidebar />);
    const root = container.querySelector(".track-list-sidebar");

    expect(root).toHaveClass("fixed", "right-0");
    expect(root).toHaveStyle({ bottom: "79px" });
  });

  it("switches its subtree to the dark brand theme", () => {
    useTrackListMock.mockReturnValue({ trackList: makeTrackList() });

    const { container } = render(<TrackListSidebar />);

    expect(container.querySelector(".track-list-sidebar")).toHaveAttribute("data-theme", "dark");
  });

  it("drops fixed positioning and fills the parent box when layout is inline", () => {
    useTrackListMock.mockReturnValue({ trackList: makeTrackList() });

    const { container } = render(<TrackListSidebar layout="inline" />);
    const root = container.querySelector(".track-list-sidebar");

    expect(root).not.toHaveClass("fixed");
    expect(root).toHaveClass("relative", "w-full", "h-full");
    expect(root).not.toHaveAttribute("style");
  });
});
