import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { z } from "zod";

const playbackState = vi.hoisted(() => ({
  key: "FR:1" as string | null,
  ready: true,
  fetchBound: vi.fn(),
}));
vi.mock("../PlaybackContext", () => ({ usePlaybackContext: () => playbackState }));
vi.mock("../usePlaybackFetch", () => ({ usePlaybackFetch: () => ({ fetchBound: playbackState.fetchBound }) }));

import { usePlaybackQuery } from "./use-playback-query";

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
const abort = () => new DOMException("Playback context changed", "AbortError");
const useIt = (enabled = true) =>
  usePlaybackQuery({
    getBackendBaseUrl: () => "https://api.example.com",
    queryKey: ["thing"],
    queryFn: (fetchBound) => fetchBound("thing/"),
    schema: z.object({ ok: z.boolean() }),
    enabled,
  });

describe("usePlaybackQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    playbackState.key = "FR:1";
    playbackState.ready = true;
  });

  it("runs the query through fetchBound", async () => {
    playbackState.fetchBound.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useIt(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ ok: true }));
    expect(playbackState.fetchBound).toHaveBeenCalledWith("thing/");
  });

  it("stays disabled until the playback context is ready", () => {
    playbackState.ready = false;
    const { result } = renderHook(() => useIt(), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(playbackState.fetchBound).not.toHaveBeenCalled();
  });

  it("appends the playback key and re-runs when it changes", async () => {
    playbackState.fetchBound.mockResolvedValue({ ok: true });
    const { result, rerender } = renderHook(() => useIt(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    playbackState.key = "AL:2";
    rerender();
    await waitFor(() => expect(playbackState.fetchBound).toHaveBeenCalledTimes(2));
  });

  it("retries once, with no delay, after a stale-context abort", async () => {
    playbackState.fetchBound.mockRejectedValueOnce(abort()).mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useIt(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ ok: true }));
    expect(playbackState.fetchBound).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second stale abort and does not retry other errors", async () => {
    playbackState.fetchBound.mockRejectedValue(abort());
    const first = renderHook(() => useIt(), { wrapper });
    await waitFor(() => expect(first.result.current.isError).toBe(true));
    expect(playbackState.fetchBound).toHaveBeenCalledTimes(2);

    playbackState.fetchBound.mockReset();
    playbackState.fetchBound.mockRejectedValue(new Error("boom"));
    const second = renderHook(() => useIt(), { wrapper });
    await waitFor(() => expect(second.result.current.isError).toBe(true));
    expect(playbackState.fetchBound).toHaveBeenCalledTimes(1);
  });
});
