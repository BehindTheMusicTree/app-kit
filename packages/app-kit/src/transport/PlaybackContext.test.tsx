import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { PlaybackContextProvider, usePlaybackContext } from "./PlaybackContext";

describe("PlaybackContextProvider", () => {
  it("refreshes on focus and invalidates old contexts", async () => {
    const load = vi.fn().mockResolvedValueOnce({ country: "FR" }).mockResolvedValue({ country: "AL" });
    const wrapper = ({ children }: { children: ReactNode }) => <PlaybackContextProvider loadContext={load}>{children}</PlaybackContextProvider>;
    const { result } = renderHook(() => usePlaybackContext(), { wrapper });
    await waitFor(() => expect(result.current.country).toBe("FR"));
    const old = result.current;
    await act(async () => { await result.current.refresh(); });
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await waitFor(() => expect(result.current.country).toBe("AL"));
    expect(old.isCurrent(old.key)).toBe(false);
  });
  it("exposes an initial failure and retries without inventing a country", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ country: null });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PlaybackContextProvider loadContext={load}>{children}</PlaybackContextProvider>
    );
    const { result } = renderHook(() => usePlaybackContext(), { wrapper });
    await waitFor(() => expect(result.current.error).toBe("offline"));
    expect(result.current.ready).toBe(false);
    expect(result.current.country).toBeNull();
    await act(async () => { await result.current.refresh(true); });
    expect(result.current.ready).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.country).toBeNull();
  });

});
