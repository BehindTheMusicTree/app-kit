import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GenreTreeAction, GenreTreeNode } from "@behindthemusictree/genre-tree-view";
import GenreActionBand from "./GenreActionBand";

const node = { id: "gp1" } as GenreTreeNode;

describe("GenreActionBand", () => {
  it("renders nothing when no action applies", () => {
    const { container } = render(<GenreActionBand node={node} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("spans the panel edges so the body margin does not inset the band", () => {
    render(<GenreActionBand node={node} onZoomIn={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Focus" }).closest(".-mx-panel-x")).not.toBeNull();
  });

  it("renders each provided action and wires its click", () => {
    const handlers = {
            onZoomIn: vi.fn(),
      onAddChild: vi.fn(),
      onRename: vi.fn(),
      onChangeParent: vi.fn(),
    };
    render(<GenreActionBand node={node} {...handlers} />);

    for (const name of ["Focus", "Add", "Rename", "Parent"]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }

    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledOnce();
  });

  it("shows a focus ring on the icon circle when the button is keyboard-focused", () => {
    render(<GenreActionBand node={node} onZoomIn={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Focus" });
    expect(button).toHaveClass("focus-visible:outline-none");
    expect(button.querySelector("span")).toHaveClass(
      "group-focus-visible:ring-2",
      "group-focus-visible:ring-[var(--color-focus-ring)]",
    );
  });

  it("renders the play actions before the other actions", () => {
    render(<GenreActionBand node={node} playActions={<button type="button">Play</button>} onZoomIn={vi.fn()} />);

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Play", "Focus"]);
  });

  it("renders additional actions and disables those that are not enabled", () => {
    const onClick = vi.fn();
    const actions: GenreTreeAction[] = [
      { key: "a", label: () => "Merge", icon: () => <span />, onClick },
      { key: "b", label: () => "Locked", icon: () => <span />, onClick, enabled: () => false },
    ];
    render(<GenreActionBand node={node} additionalActions={() => actions} />);

    fireEvent.click(screen.getByRole("button", { name: "Merge" }));

    expect(onClick).toHaveBeenCalledWith(expect.anything(), node);
    expect(screen.getByRole("button", { name: "Locked" })).toBeDisabled();
  });

  it("labels the side toggle from the current side and wires its click", () => {
    const onToggleSide = vi.fn();
    const { rerender } = render(<GenreActionBand node={node} side="core" onToggleSide={onToggleSide} />);
    fireEvent.click(screen.getByRole("button", { name: "Make pop" }));

    rerender(<GenreActionBand node={node} side="pop" onToggleSide={onToggleSide} />);
    fireEvent.click(screen.getByRole("button", { name: "Make core" }));

    expect(onToggleSide).toHaveBeenCalledTimes(2);
  });

  it("disables the side toggle with the reason as its tooltip", () => {
    render(<GenreActionBand node={node} side="core" onToggleSide={vi.fn()} toggleSideDisabledReason="Taken" />);

    const toggle = screen.getByRole("button", { name: "Make pop" });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute("title", "Taken");
  });
});
