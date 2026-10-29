import { render as rtlRender, type RenderOptions, type RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TrackNounProvider } from "@behindthemusictree/app-kit/track-noun";
import { useState, type ReactElement, type ReactNode } from "react";

function TrackNounWrapper({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <TrackNounProvider singular="track" plural="tracks">
        {children}
      </TrackNounProvider>
    </QueryClientProvider>
  );
}

export function render(ui: ReactElement, options?: Omit<RenderOptions, "queries">): RenderResult {
  return rtlRender(ui, { wrapper: TrackNounWrapper, ...options });
}
