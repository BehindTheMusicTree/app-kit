import { render as rtlRender, type RenderOptions, type RenderResult } from "@testing-library/react";
import { TrackNounProvider } from "@behindthemusictree/app-kit/track-noun";
import type { ReactElement, ReactNode } from "react";

function TrackNounWrapper({ children }: { children: ReactNode }) {
  return (
    <TrackNounProvider singular="track" plural="tracks">
      {children}
    </TrackNounProvider>
  );
}

export function render(ui: ReactElement, options?: Omit<RenderOptions, "queries">): RenderResult {
  return rtlRender(ui, { wrapper: TrackNounWrapper, ...options });
}
