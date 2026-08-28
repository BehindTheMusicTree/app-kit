import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

import { GenreTreeWheelHandoff } from "./GenreTreeWheelHandoff";

// requestAnimationFrame isn't driven by fake timers by default in jsdom — stub it onto a
// manually-flushable queue so the test can step through the handoff's two nested rAFs
// deterministically instead of relying on real frame timing.
function stubRaf() {
  let queue: FrameRequestCallback[] = [];
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    id += 1;
    queue.push(cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (_handle: number) => {
    // Not needed for these tests: nothing here relies on cancellation actually removing a
    // specific queued callback.
  });
  return {
    flush: () => {
      const current = queue;
      queue = [];
      current.forEach((cb) => cb(0));
    },
  };
}

describe("GenreTreeWheelHandoff", () => {
  let raf: ReturnType<typeof stubRaf>;

  beforeEach(() => {
    raf = stubRaf();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows only the skeleton immediately after mount, with children hidden underneath", () => {
    render(
      <GenreTreeWheelHandoff skeleton={<div data-testid="skeleton" />}>
        <div data-testid="graph" />
      </GenreTreeWheelHandoff>,
    );

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    const graphWrapper = screen.getByTestId("graph").parentElement as HTMLElement;
    expect(graphWrapper.style.opacity).toBe("0");
    expect(graphWrapper.style.pointerEvents).toBe("none");
  });

  it("keeps the skeleton visible through the first animation frame", () => {
    render(
      <GenreTreeWheelHandoff skeleton={<div data-testid="skeleton" />}>
        <div data-testid="graph" />
      </GenreTreeWheelHandoff>,
    );

    act(() => {
      raf.flush();
    });

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    const graphWrapper = screen.getByTestId("graph").parentElement as HTMLElement;
    expect(graphWrapper.style.opacity).toBe("0");
  });

  it("reveals children and removes the skeleton after the second animation frame", () => {
    render(
      <GenreTreeWheelHandoff skeleton={<div data-testid="skeleton" />}>
        <div data-testid="graph" />
      </GenreTreeWheelHandoff>,
    );

    act(() => {
      raf.flush();
      raf.flush();
    });

    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
    const graphWrapper = screen.getByTestId("graph").parentElement as HTMLElement;
    expect(graphWrapper.style.opacity).toBe("1");
    expect(graphWrapper.style.pointerEvents).toBe("auto");
  });

  it("restarts the handoff (skeleton back on top) when remounted", () => {
    const { unmount } = render(
      <GenreTreeWheelHandoff skeleton={<div data-testid="skeleton" />}>
        <div data-testid="graph" />
      </GenreTreeWheelHandoff>,
    );

    act(() => {
      raf.flush();
      raf.flush();
    });
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();

    unmount();

    render(
      <GenreTreeWheelHandoff skeleton={<div data-testid="skeleton" />}>
        <div data-testid="graph" />
      </GenreTreeWheelHandoff>,
    );

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });
});
