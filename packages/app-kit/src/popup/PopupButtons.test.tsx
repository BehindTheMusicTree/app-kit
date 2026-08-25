"use client";

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PopupButtons } from "./PopupButtons";

describe("PopupButtons", () => {
  afterEach(() => {
    cleanup();
  });

  it("centers children by default", () => {
    render(
      <PopupButtons>
        <button>OK</button>
      </PopupButtons>,
    );

    expect(screen.getByRole("button", { name: "OK" }).parentElement).toHaveClass("justify-center");
  });

  it("left-aligns children when alignment is left", () => {
    render(
      <PopupButtons alignment="left">
        <button>OK</button>
      </PopupButtons>,
    );

    expect(screen.getByRole("button", { name: "OK" }).parentElement).toHaveClass("justify-start");
  });

  it("right-aligns children when alignment is right", () => {
    render(
      <PopupButtons alignment="right">
        <button>OK</button>
      </PopupButtons>,
    );

    expect(screen.getByRole("button", { name: "OK" }).parentElement).toHaveClass("justify-end");
  });

  it("applies an additional className", () => {
    render(
      <PopupButtons className="mt-4">
        <button>OK</button>
      </PopupButtons>,
    );

    expect(screen.getByRole("button", { name: "OK" }).parentElement).toHaveClass("mt-4");
  });
});
