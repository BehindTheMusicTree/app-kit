import { describe, it, expect, beforeEach, vi } from "vitest";

describe("loadYoutubeIframeApi", () => {
  beforeEach(() => {
    vi.resetModules();
    delete (window as { YT?: unknown }).YT;
    delete window.onYouTubeIframeAPIReady;
    document.head.innerHTML = "";
  });

  it("resolves immediately when window.YT.Player already exists", async () => {
    const existingYT = { Player: vi.fn() };
    (window as unknown as { YT: unknown }).YT = existingYT;

    const { loadYoutubeIframeApi } = await import("./youtubeIframeApi");
    const result = await loadYoutubeIframeApi();

    expect(result).toBe(existingYT);
    expect(document.head.querySelector("script")).toBeNull();
  });

  it("injects the iframe API script and resolves once onYouTubeIframeAPIReady fires", async () => {
    const { loadYoutubeIframeApi } = await import("./youtubeIframeApi");

    const promise = loadYoutubeIframeApi();

    const script = document.head.querySelector("script");
    expect(script).not.toBeNull();
    expect(script?.src).toBe("https://www.youtube.com/iframe_api");

    const resolvedYT = { Player: vi.fn() };
    (window as unknown as { YT: unknown }).YT = resolvedYT;
    window.onYouTubeIframeAPIReady?.();

    await expect(promise).resolves.toBe(resolvedYT);
  });

  it("calls a previously-registered onYouTubeIframeAPIReady callback and shares one in-flight promise across callers", async () => {
    const previousCallback = vi.fn();
    window.onYouTubeIframeAPIReady = previousCallback;

    const { loadYoutubeIframeApi } = await import("./youtubeIframeApi");

    const promise1 = loadYoutubeIframeApi();
    const promise2 = loadYoutubeIframeApi();

    expect(document.head.querySelectorAll("script")).toHaveLength(1);

    const resolvedYT = { Player: vi.fn() };
    (window as unknown as { YT: unknown }).YT = resolvedYT;
    window.onYouTubeIframeAPIReady?.();

    await expect(promise1).resolves.toBe(resolvedYT);
    await expect(promise2).resolves.toBe(resolvedYT);
    expect(previousCallback).toHaveBeenCalled();
  });

  it("rejects when called outside a browser environment", async () => {
    const { loadYoutubeIframeApi } = await import("./youtubeIframeApi");
    const originalWindow = globalThis.window;
    // @ts-expect-error simulating a non-browser environment
    delete globalThis.window;

    await expect(loadYoutubeIframeApi()).rejects.toThrow(
      "YouTube IFrame API can only be loaded in the browser",
    );

    globalThis.window = originalWindow;
  });
});
