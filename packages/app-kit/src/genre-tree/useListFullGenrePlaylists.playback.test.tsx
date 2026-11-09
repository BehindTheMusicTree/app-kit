import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { rawFetchMock } = vi.hoisted(() => ({ rawFetchMock: vi.fn() }));

vi.mock("../transport/connectivity-error-context", () => ({
  useConnectivityError: () => ({ setConnectivityError: vi.fn() }),
}));
vi.mock("../auth/SessionContext", () => ({
  useSession: () => ({ clearSession: vi.fn(), session: null, sessionRestored: true }),
}));
vi.mock("../transport/fetch-wrapper", () => ({
  fetchWrapper: (...args: unknown[]) => rawFetchMock(...args),
}));

import { PlaybackContextProvider } from "../transport/PlaybackContext";
import { useListFullGenrePlaylists } from "./useGenrePlaylist";

describe("useListFullGenrePlaylists with a real PlaybackContextProvider", () => {
  it("loads the tree when the playback context goes from unknown to FR mid-request", async () => {
    // The tree request starts before the provider's first context load; the country arrives while it is in flight.
    let resolveContext!: (value: unknown) => void;
    const context = new Promise((resolve) => { resolveContext = resolve; });
    const loadContext = () => context;
    rawFetchMock.mockImplementation(async () => {
      resolveContext({ country: "FR" });
      await new Promise((resolve) => setTimeout(resolve, 20));
      return [];
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <PlaybackContextProvider loadContext={loadContext}>{children}</PlaybackContextProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useListFullGenrePlaylists("reference", () => "https://api.example.com"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(rawFetchMock).toHaveBeenCalledTimes(1);
  });
});
