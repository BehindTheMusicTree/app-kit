import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, fireEvent, cleanup } from "@testing-library/react";
import { render } from "../test-utils";

const { usePlayerMock, useVisibilityMock } = vi.hoisted(() => ({
  usePlayerMock: vi.fn(),
  useVisibilityMock: vi.fn(),
}));

vi.mock("@behindthemusictree/app-kit/player", () => ({
  usePlayer: usePlayerMock,
  PlayerVideoSurface: () => <div data-testid="video" />,
}));
vi.mock("@behindthemusictree/app-kit/genre-tree", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTrackListSidebarVisibility: useVisibilityMock,
}));
vi.mock("./track-list-sidebar/TrackListSidebar", () => ({
  default: ({
    isCollapsed,
    onExpand,
    onMinimize,
  }: {
    isCollapsed?: boolean;
    onExpand?: () => void;
    onMinimize?: () => void;
  }) => (
    <div data-testid="sidebar" data-collapsed={isCollapsed}>
      <button
        type="button"
        aria-label={isCollapsed ? "Show tracks" : "Hide tracks"}
        onClick={isCollapsed ? onExpand : onMinimize}
      />
    </div>
  ),
}));
vi.mock("./PlayerControls", () => ({
  default: () => <div data-testid="player-controls" />,
}));

import PlayerPanel from "./PlayerPanel";

const toggleTrackListSidebar = vi.fn();

const setup = (isTrackListSidebarVisible: boolean) => {
  usePlayerMock.mockReturnValue({ playerTrackObject: { track: { title: "Song A" } } });
  useVisibilityMock.mockReturnValue({ isTrackListSidebarVisible, toggleTrackListSidebar });
};

describe("PlayerPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("extends and shrinks from the middle edge tab", () => {
    setup(true);
    const { container } = render(<PlayerPanel extendedWidth="500px" />);
    expect(container.firstChild).toHaveClass("w-[var(--layout-right-w)]");

    fireEvent.click(screen.getByRole("button", { name: "Extend player panel" }));
    expect(container.firstChild).toHaveStyle({ width: "500px" });

    fireEvent.click(screen.getByRole("button", { name: "Shrink player panel" }));
    expect(container.firstChild).toHaveClass("w-[var(--layout-right-w)]");
    expect(screen.queryByRole("button", { name: "Extend song list panel" })).not.toBeInTheDocument();
  });

  it("hides the song list from the From header", () => {
    setup(true);
    render(<PlayerPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Hide tracks" }));
    expect(toggleTrackListSidebar).toHaveBeenCalledTimes(1);
  });

  it("keeps the From header visible and shows a track-list action when rows are hidden", () => {
    setup(false);
    render(<PlayerPanel />);
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-collapsed", "true");
    expect(screen.queryByRole("button", { name: "Extend player panel" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show tracks" }));
    expect(toggleTrackListSidebar).toHaveBeenCalledTimes(1);
  });

  it("places player controls below the video and before the track list", () => {
    setup(true);
    render(<PlayerPanel />);

    const video = screen.getByTestId("video");
    const controls = screen.getByTestId("player-controls");
    const trackList = screen.getByTestId("sidebar");

    expect(video.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(controls.compareDocumentPosition(trackList) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("follows a controlled expanded prop and reports toggles", () => {
    setup(true);
    const onExpandedChange = vi.fn();
    const { container } = render(
      <PlayerPanel expanded onExpandedChange={onExpandedChange} extendedWidth="500px" />,
    );
    expect(container.firstChild).toHaveStyle({ width: "500px" });

    fireEvent.click(screen.getByRole("button", { name: "Shrink player panel" }));
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it("minimizes to video-only without closing or unmounting the player", () => {
    setup(true);
    const onExpandedChange = vi.fn();
    const { container, rerender } = render(
      <PlayerPanel expanded onExpandedChange={onExpandedChange} extendedWidth="500px" />,
    );
    expect(container.firstChild).toHaveStyle({ width: "500px" });
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide tracks" }));
    expect(toggleTrackListSidebar).toHaveBeenCalledTimes(1);
    expect(onExpandedChange).toHaveBeenCalledWith(false);

    setup(false);
    rerender(<PlayerPanel expanded={false} onExpandedChange={onExpandedChange} extendedWidth="500px" />);
    expect(container.firstChild).toHaveClass("w-[var(--layout-right-w)]");
    expect(screen.getByTestId("video")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-collapsed", "true");
    expect(screen.queryByRole("button", { name: "Close player" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show tracks" }));
    expect(toggleTrackListSidebar).toHaveBeenCalledTimes(2);
    setup(true);
    rerender(<PlayerPanel expanded={false} onExpandedChange={onExpandedChange} extendedWidth="500px" />);
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-collapsed", "false");
    expect(screen.getByRole("button", { name: "Hide tracks" })).toBeInTheDocument();
  });
});
