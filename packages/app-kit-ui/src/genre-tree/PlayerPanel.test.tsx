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

const setup = (isTrackListSidebarVisible: boolean) => {
  usePlayerMock.mockReturnValue({ playerTrackObject: { track: { title: "Song A" } } });
  useVisibilityMock.mockReturnValue({ isTrackListSidebarVisible, toggleTrackListSidebar: vi.fn() });
};

describe("PlayerPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("offers the extend toggle only while the song list is visible, and widens the panel when used", () => {
    setup(false);
    const { container, rerender } = render(<PlayerPanel onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Extend song list panel" })).not.toBeInTheDocument();

    setup(true);
    rerender(<PlayerPanel onClose={vi.fn()} extendedWidth="500px" />);
    expect(container.firstChild).toHaveClass("w-[280px]");

    fireEvent.click(screen.getByRole("button", { name: "Extend song list panel" }));
    expect(container.firstChild).toHaveStyle({ width: "500px" });

    fireEvent.click(screen.getByRole("button", { name: "Shrink song list panel" }));
    expect(container.firstChild).toHaveClass("w-[280px]");
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
