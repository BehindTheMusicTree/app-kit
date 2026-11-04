"use client";

import { useEffect } from "react";

/** Gives the brand layout tokens a zero-width left column while no left detail panel is showing. */
export function useLeftDetailPanelLayout(isPanelShown: boolean, enabled = true) {
  useEffect(() => {
    if (!enabled || isPanelShown) return undefined;
    const root = document.documentElement;
    root.style.setProperty("--layout-left-w", "0px");
    return () => {
      root.style.removeProperty("--layout-left-w");
    };
  }, [enabled, isPanelShown]);
}
