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

  it("renders each provided action and wires its click", () => {
    const handlers = {
      onPlayPause: vi.fn(),
      onZoomIn: vi.fn(),
      onAddChild: vi.fn(),
      onRename: vi.fn(),
      onChangeParent: vi.fn(),
    };
    render(<GenreActionBand node={node} {...handlers} />);

    for (const name of ["Play", "Focus", "Add", "Rename", "Parent"]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }

    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledOnce();
  });

  it("labels the play action Pause while playing", () => {
    render(<GenreActionBand node={node} onPlayPause={vi.fn()} isPlaying />);

    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
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
});
