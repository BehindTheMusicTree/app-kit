import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { rawFetchMock } = vi.hoisted(() => ({ rawFetchMock: vi.fn() }));

const playbackState = vi.hoisted(() => ({
  key: null as string | null,
  country: null as string | null,
  snapshot: () => ({ key: playbackState.key, country: playbackState.country }),
  refresh: vi.fn(async (_force?: boolean) => null as string | null),
  isCurrent: vi.fn(() => true),
}));
vi.mock("./PlaybackContext", () => ({ usePlaybackContext: () => playbackState }));
vi.mock("./connectivity-error-context", () => ({
  useConnectivityError: () => ({ setConnectivityError: vi.fn() }),
}));
vi.mock("../auth/SessionContext", () => ({
  useSession: () => ({ clearSession: vi.fn(), session: { accessToken: "token" }, sessionRestored: true }),
}));
vi.mock("./fetch-wrapper", () => ({
  fetchWrapper: (...args: unknown[]) => rawFetchMock(...args),
}));

import { usePlaybackFetch } from "./usePlaybackFetch";

describe("usePlaybackFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    playbackState.key = null;
    playbackState.country = null;
    playbackState.isCurrent.mockReturnValue(true);
  });

  it("retries an explicit play once if country changes during the response", async () => {
    playbackState.key = "FR:1";
    playbackState.country = "FR";
    playbackState.isCurrent.mockImplementation((...args: unknown[]) => args[0] === playbackState.key);
    rawFetchMock.mockImplementationOnce(async (...args: unknown[]) => {
      playbackState.key = "AL:2";
      playbackState.country = "AL";
      await (args[9] as (response: Response) => Promise<void>)(new Response(null, { headers: { "X-Playback-Country": "FR" } }));
    }).mockImplementationOnce(async (...args: unknown[]) => {
      await (args[9] as (response: Response) => Promise<void>)(new Response(null, { headers: { "X-Playback-Country": "AL" } }));
      return { results: ["new"] };
    });
    const { result } = renderHook(() => usePlaybackFetch(() => "https://api.example.com"));
    await expect(result.current.fetchLatest("library/songs/", true, false))
      .resolves.toEqual({ results: ["new"] });
    expect(rawFetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses the refreshed context for an explicit play request", async () => {
    playbackState.key = "FR:1";
    playbackState.country = "FR";
    playbackState.refresh.mockImplementationOnce(async () => {
      playbackState.key = "AL:2";
      playbackState.country = "AL";
      return "AL";
    });
    playbackState.isCurrent.mockImplementation((...args: unknown[]) => args[0] === playbackState.key);
    rawFetchMock.mockImplementationOnce(async (...args: unknown[]) => {
      await (args[9] as (response: Response) => Promise<void>)(new Response(null, { headers: { "X-Playback-Country": "AL" } }));
      return { results: ["new"] };
    });
    const { result } = renderHook(() => usePlaybackFetch(() => "https://api.example.com"));
    await expect(result.current.fetchLatest("library/songs/", true, false))
      .resolves.toEqual({ results: ["new"] });
  });

  it.each(["library/songs/", "genre-playlists/example/tracks/", "me/genre-playlists/example/tracks/"])("discards a changed-country response from %s", async (endpoint) => {
    playbackState.key = "FR:1";
    playbackState.country = "FR";
    rawFetchMock.mockImplementationOnce(async (...args: unknown[]) => {
      await (args[9] as (response: Response) => Promise<void>)(new Response(null, { headers: { "X-Playback-Country": "AL" } }));
      return { results: [] };
    });
    const { result } = renderHook(() => usePlaybackFetch(() => "https://api.example.com"));
    await expect(result.current.fetchBound(endpoint, true, false)).rejects.toMatchObject({ name: "AbortError" });
    expect(playbackState.refresh).toHaveBeenCalledWith(true);
  });

  it.each([
    ["FR", "FR"],
    [null, "unknown"],
    ["FR", null],
  ])("accepts country %s with response header %s", async (country, header) => {
    playbackState.key = `${country ?? "unknown"}:1`;
    playbackState.country = country;
    rawFetchMock.mockImplementationOnce(async (...args: unknown[]) => {
      await (args[9] as (response: Response) => Promise<void>)(new Response(null, {
        headers: header === null ? {} : { "X-Playback-Country": header },
      }));
      return { results: [] };
    });
    const { result } = renderHook(() => usePlaybackFetch(() => "https://api.example.com"));
    await expect(result.current.fetchBound("library/songs/", true, false)).resolves.toEqual({ results: [] });
    expect(playbackState.refresh).not.toHaveBeenCalledWith(true);
  });

  it("discards a response when the context changed while its body was loading", async () => {
    playbackState.key = "FR:1";
    playbackState.country = "FR";
    rawFetchMock.mockImplementationOnce(async (...args: unknown[]) => {
      await (args[9] as (response: Response) => Promise<void>)(new Response(null, { headers: { "X-Playback-Country": "FR" } }));
      playbackState.isCurrent.mockReturnValue(false);
      return { results: [] };
    });
    const { result } = renderHook(() => usePlaybackFetch(() => "https://api.example.com"));
    await expect(result.current.fetchBound("library/songs/", true, false)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("is not tied to the endpoint: any path goes through the playback check", async () => {
    playbackState.key = "FR:1";
    playbackState.country = "FR";
    rawFetchMock.mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => usePlaybackFetch(() => "https://api.example.com"));
    await expect(result.current.fetchBound("artists/x/", true, false)).resolves.toEqual({ ok: true });
    expect(playbackState.refresh).toHaveBeenCalled();
  });
});
