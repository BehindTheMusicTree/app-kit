import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  TrackListSidebarVisibilityProvider,
  useTrackListSidebarVisibility,
} from "./TrackListSidebarVisibilityContext";

function Consumer() {
  const { isTrackListSidebarVisible, toggleTrackListSidebar, showTrackListSidebar, hideTrackListSidebar } =
    useTrackListSidebarVisibility();
  return (
    <div>
      <span data-testid="visibility">{isTrackListSidebarVisible ? "visible" : "hidden"}</span>
      <button onClick={toggleTrackListSidebar}>toggle</button>
      <button onClick={showTrackListSidebar}>show</button>
      <button onClick={hideTrackListSidebar}>hide</button>
    </div>
  );
}

describe("TrackListSidebarVisibilityContext", () => {
  it("throws when used outside of the provider", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Consumer />)).toThrow(
      "useTrackListSidebarVisibility must be used within a TrackListSidebarVisibilityProvider",
    );

    consoleErrorSpy.mockRestore();
  });

  it("defaults to hidden", () => {
    render(
      <TrackListSidebarVisibilityProvider>
        <Consumer />
      </TrackListSidebarVisibilityProvider>,
    );

    expect(screen.getByTestId("visibility")).toHaveTextContent("hidden");
  });

  it("toggles visibility", () => {
    render(
      <TrackListSidebarVisibilityProvider>
        <Consumer />
      </TrackListSidebarVisibilityProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("visibility")).toHaveTextContent("visible");

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("visibility")).toHaveTextContent("hidden");
  });

  it("shows and hides visibility explicitly", () => {
    render(
      <TrackListSidebarVisibilityProvider>
        <Consumer />
      </TrackListSidebarVisibilityProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "show" }));
    expect(screen.getByTestId("visibility")).toHaveTextContent("visible");

    fireEvent.click(screen.getByRole("button", { name: "hide" }));
    expect(screen.getByTestId("visibility")).toHaveTextContent("hidden");
  });
});
