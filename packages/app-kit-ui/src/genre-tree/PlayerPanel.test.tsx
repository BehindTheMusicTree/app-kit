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
  default: () => <div data-testid="sidebar" />,
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

  it("offers the extend tab only while the song list is visible, and widens the panel when used", () => {
    setup(false);
    const { container, rerender } = render(<PlayerPanel onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Extend song list panel" })).not.toBeInTheDocument();

    setup(true);
    rerender(<PlayerPanel onClose={vi.fn()} extendedWidth="500px" />);
    expect(container.firstChild).toHaveClass("w-[var(--layout-right-w)]");

    fireEvent.click(screen.getByRole("button", { name: "Extend song list panel" }));
    expect(container.firstChild).toHaveStyle({ width: "500px" });

    fireEvent.click(screen.getByRole("button", { name: "Shrink song list panel" }));
    expect(container.firstChild).toHaveClass("w-[var(--layout-right-w)]");
  });

  it("hides the song list from the edge tab, leaving only the video", () => {
    setup(true);
    render(<PlayerPanel onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide song list" }));
    expect(toggleTrackListSidebar).toHaveBeenCalledTimes(1);
  });

  it("shows the song list again from the only tab button when it is hidden", () => {
    setup(false);
    render(<PlayerPanel onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Hide song list" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show song list" }));
    expect(toggleTrackListSidebar).toHaveBeenCalledTimes(1);
  });

  it("follows a controlled expanded prop and reports toggles", () => {
    setup(true);
    const onExpandedChange = vi.fn();
    const { container } = render(
      <PlayerPanel onClose={vi.fn()} expanded onExpandedChange={onExpandedChange} extendedWidth="500px" />,
    );
    expect(container.firstChild).toHaveStyle({ width: "500px" });

    fireEvent.click(screen.getByRole("button", { name: "Shrink song list panel" }));
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it("hides via CSS when not visible and calls onClose", () => {
    setup(false);
    const onClose = vi.fn();
    const { container } = render(<PlayerPanel isVisible={false} onClose={onClose} />);
    expect(container.firstChild).toHaveClass("hidden");
    expect(screen.getByTestId("video")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close player" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
