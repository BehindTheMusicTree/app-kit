import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useLeftDetailPanelLayout } from "./useLeftDetailPanelLayout";

const leftWidth = () => document.documentElement.style.getPropertyValue("--layout-left-w");

describe("useLeftDetailPanelLayout", () => {
  afterEach(() => document.documentElement.style.removeProperty("--layout-left-w"));

  it("zeroes the left column while no panel is shown and restores it on unmount", () => {
    const { unmount } = renderHook(() => useLeftDetailPanelLayout(false));
    expect(leftWidth()).toBe("0px");

    unmount();
    expect(leftWidth()).toBe("");
  });

  it("leaves the left column alone while a panel is shown", () => {
    renderHook(() => useLeftDetailPanelLayout(true));

    expect(leftWidth()).toBe("");
  });

  it("does nothing when disabled", () => {
    renderHook(() => useLeftDetailPanelLayout(false, false));

    expect(leftWidth()).toBe("");
  });
});
