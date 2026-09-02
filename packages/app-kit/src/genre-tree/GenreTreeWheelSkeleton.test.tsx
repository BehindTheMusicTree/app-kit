import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GenreTreeWheelSkeleton } from "./GenreTreeWheelSkeleton";

describe("GenreTreeWheelSkeleton", () => {
  it("renders an accessible loading label and a hidden svg wheel", () => {
    render(<GenreTreeWheelSkeleton />);

    expect(screen.getByText("Loading genre tree…")).toBeInTheDocument();
    const svg = document.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("renders the wheel ring guide, hub circle, and accent dot", () => {
    render(<GenreTreeWheelSkeleton />);

    expect(document.querySelectorAll("circle").length).toBe(4);
  });

  it("renders chip/branch rects and connector paths", () => {
    render(<GenreTreeWheelSkeleton />);

    expect(document.querySelectorAll("rect").length).toBeGreaterThan(1);
    expect(document.querySelectorAll("path").length).toBeGreaterThan(0);
  });

  it("extends the color sectors to the canvas's own corners, not a circle inscribed in it", () => {
    render(<GenreTreeWheelSkeleton />);

    const svg = document.querySelector("svg") as SVGSVGElement;
    const [minX, minY, width, height] = (svg.getAttribute("viewBox") as string)
      .split(" ")
      .map(Number);
    const cornerDistance = Math.max(
      Math.hypot(minX, minY),
      Math.hypot(minX + width, minY),
      Math.hypot(minX, minY + height),
      Math.hypot(minX + width, minY + height),
    );

    const sectorPath = document.querySelector('path[fill^="#"]') as SVGPathElement;
    expect(sectorPath).not.toBeNull();
    const radiusMatch = sectorPath.getAttribute("d")?.match(/A([\d.]+),([\d.]+)/);
    expect(radiusMatch).not.toBeNull();
    const sectorRadius = Number(radiusMatch![1]);

    // A radius merely reaching the canvas's own bounding box (half-width/height) would still
    // leave the rectangle's corners uncolored — it must reach the corners themselves.
    expect(sectorRadius).toBeCloseTo(cornerDistance, 5);
    expect(sectorRadius).toBeGreaterThan(Math.min(width, height) / 2);
  });

  it("renders unique gradient/mask ids across multiple mounted instances", () => {
    const { container: containerA } = render(<GenreTreeWheelSkeleton />);
    const { container: containerB } = render(<GenreTreeWheelSkeleton />);

    const maskIdA = containerA.querySelector("mask")?.id;
    const maskIdB = containerB.querySelector("mask")?.id;
    expect(maskIdA).toBeTruthy();
    expect(maskIdB).toBeTruthy();
    expect(maskIdA).not.toBe(maskIdB);
  });
});
