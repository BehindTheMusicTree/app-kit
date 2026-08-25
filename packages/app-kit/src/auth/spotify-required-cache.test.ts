import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getSpotifyRequiredCached,
  setSpotifyRequiredCached,
  clearSpotifyRequiredCached,
} from "./spotify-required-cache";

describe("spotify-required-cache", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns false when nothing has been cached", () => {
    expect(getSpotifyRequiredCached()).toBe(false);
  });

  it("returns true after setSpotifyRequiredCached is called", () => {
    setSpotifyRequiredCached();

    expect(getSpotifyRequiredCached()).toBe(true);
    expect(sessionStorage.getItem("spotify_required")).toBe("1");
  });

  it("returns false again after clearSpotifyRequiredCached is called", () => {
    setSpotifyRequiredCached();

    clearSpotifyRequiredCached();

    expect(getSpotifyRequiredCached()).toBe(false);
    expect(sessionStorage.getItem("spotify_required")).toBeNull();
  });

  describe("when window is undefined (SSR)", () => {
    const originalWindow = globalThis.window;

    beforeEach(() => {
      // @ts-expect-error simulating an SSR environment where window is undefined
      delete globalThis.window;
    });

    afterEach(() => {
      globalThis.window = originalWindow;
    });

    it("getSpotifyRequiredCached returns false without touching sessionStorage", () => {
      expect(getSpotifyRequiredCached()).toBe(false);
    });

    it("setSpotifyRequiredCached is a no-op", () => {
      expect(() => setSpotifyRequiredCached()).not.toThrow();
    });

    it("clearSpotifyRequiredCached is a no-op", () => {
      expect(() => clearSpotifyRequiredCached()).not.toThrow();
    });
  });
});
