import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { useTrackListMock, useTrackListSidebarVisibilityMock } = vi.hoisted(() => ({
  useTrackListMock: vi.fn(),
  useTrackListSidebarVisibilityMock: vi.fn(),
}));

vi.mock("../TrackListContext", () => ({ useTrackList: useTrackListMock }));
vi.mock("../TrackListSidebarVisibilityContext", () => ({
  useTrackListSidebarVisibility: useTrackListSidebarVisibilityMock,
}));
vi.mock("./TrackItem", () => ({
  default: ({ track }: { track: { uuid: string; title: string } }) => <span>{track.title}</span>,
}));

import TrackListSidebar from "./TrackListSidebar";
import { TrackListOriginType } from "../models/TrackListOriginType";

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
  const hideTrackListSidebar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useTrackListSidebarVisibilityMock.mockReturnValue({ hideTrackListSidebar });
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

  it("shows genre playlist label and pluralized track count", () => {
    useTrackListMock.mockReturnValue({ trackList: makeTrackList() });

    render(<TrackListSidebar />);

    expect(screen.getByText(/Genre playlist/)).toBeInTheDocument();
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

    expect(screen.getByText(/track playlist/)).toBeInTheDocument();
    expect(screen.getByText(/1 track /)).toBeInTheDocument();
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
        expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load more genre playlist tracks:", error),
      );
      consoleErrorSpy.mockRestore();
    });
  });

  it("calls hideTrackListSidebar when the close control is clicked", () => {
    useTrackListMock.mockReturnValue({ trackList: makeTrackList() });

    render(<TrackListSidebar />);
    fireEvent.click(screen.getByText("✕"));

    expect(hideTrackListSidebar).toHaveBeenCalled();
  });

  it("defaults to fixed positioning", () => {
    useTrackListMock.mockReturnValue({ trackList: makeTrackList() });

    const { container } = render(<TrackListSidebar />);
    const root = container.querySelector(".track-list-sidebar");

    expect(root).toHaveClass("fixed", "right-0");
    expect(root).toHaveStyle({ bottom: "79px" });
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
