import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, fireEvent, cleanup } from "@testing-library/react";
import { render } from "../test-utils";
import PanelEdgeTab from "./PanelEdgeTab";

describe("PanelEdgeTab", () => {
  afterEach(cleanup);

  it("renders nothing without actions", () => {
    const { container } = render(<PanelEdgeTab side="left" edge={null} center={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders only the provided buttons and wires their callbacks", () => {
    const onEdge = vi.fn();
    const onCenter = vi.fn();
    render(
      <PanelEdgeTab
        side="left"
        controls="panel"
        edge={{ label: "Hide", onClick: onEdge }}
        center={{ label: "Extend", onClick: onCenter, expanded: false }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    fireEvent.click(screen.getByRole("button", { name: "Extend" }));
    expect(onEdge).toHaveBeenCalledTimes(1);
    expect(onCenter).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Extend" })).toHaveAttribute("aria-controls", "panel");
    expect(screen.getByRole("button", { name: "Extend" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Hide" })).not.toHaveAttribute("aria-expanded");
  });

  it("shows a single button when only one action is given", () => {
    render(<PanelEdgeTab side="right" edge={null} center={{ label: "Show", onClick: vi.fn() }} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("orders buttons edge-first on the left and center-first on the right", () => {
    const actions = { edge: { label: "Edge", onClick: vi.fn() }, center: { label: "Center", onClick: vi.fn() } };
    const { rerender } = render(<PanelEdgeTab side="left" {...actions} />);
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Edge", "Center"]);
    rerender(<PanelEdgeTab side="right" {...actions} />);
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Center", "Edge"]);
  });
});
