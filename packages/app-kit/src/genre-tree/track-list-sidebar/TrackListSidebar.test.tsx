import { describe, it, expect, vi, beforeEach } from "vitest";
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
      }),
    });

    render(<TrackListSidebar />);

    expect(screen.getByText(/track playlist/)).toBeInTheDocument();
    expect(screen.getByText(/1 track /)).toBeInTheDocument();
  });

  it("calls hideTrackListSidebar when the close control is clicked", () => {
    useTrackListMock.mockReturnValue({ trackList: makeTrackList() });

    render(<TrackListSidebar />);
    fireEvent.click(screen.getByText("✕"));

    expect(hideTrackListSidebar).toHaveBeenCalled();
  });
});
