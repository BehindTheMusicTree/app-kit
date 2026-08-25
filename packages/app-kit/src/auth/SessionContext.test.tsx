import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";

const { invalidateQueriesMock, clearQueryClientMock, clearSpotifyRequiredCachedMock } = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn(),
  clearQueryClientMock: vi.fn(),
  clearSpotifyRequiredCachedMock: vi.fn(),
}));

vi.mock("../transport/query-client", () => ({
  queryClient: { invalidateQueries: invalidateQueriesMock, clear: clearQueryClientMock },
}));

vi.mock("./spotify-required-cache", () => ({
  clearSpotifyRequiredCached: clearSpotifyRequiredCachedMock,
}));

import { SessionProvider, useSession } from "./SessionContext";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), writable: true });

const wrapper = ({ children }: { children: ReactNode }) => <SessionProvider>{children}</SessionProvider>;

describe("SessionContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("throws when useSession is used outside a SessionProvider", () => {
    expect(() => renderHook(() => useSession())).toThrow("useSession must be used within a SessionProvider");
  });

  it("starts with the default session and marks it restored when nothing is stored", () => {
    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.session).toEqual({ accessToken: null, refreshToken: null, expiresAt: null });
    expect(result.current.sessionRestored).toBe(true);
    expect(invalidateQueriesMock).not.toHaveBeenCalled();
  });

  it("restores a stored session with an access token and invalidates queries", () => {
    localStorage.setItem("session", JSON.stringify({ accessToken: "abc", refreshToken: "r", expiresAt: 1 }));

    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.session).toEqual({ accessToken: "abc", refreshToken: "r", expiresAt: 1 });
    expect(invalidateQueriesMock).toHaveBeenCalled();
  });

  it("restores a stored session without an access token and does not invalidate queries", () => {
    localStorage.setItem("session", JSON.stringify({ accessToken: null, refreshToken: null, expiresAt: null }));

    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.session).toEqual({ accessToken: null, refreshToken: null, expiresAt: null });
    expect(invalidateQueriesMock).not.toHaveBeenCalled();
  });

  it("clears the stored session and keeps the default session when the stored value is invalid JSON", () => {
    localStorage.setItem("session", "not-json");

    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.session).toEqual({ accessToken: null, refreshToken: null, expiresAt: null });
    expect(localStorage.getItem("session")).toBeNull();
    expect(result.current.sessionRestored).toBe(true);
  });

  it("setSession updates state and persists to localStorage", () => {
    const { result } = renderHook(() => useSession(), { wrapper });

    act(() => {
      result.current.setSession({ accessToken: "new", refreshToken: "r2", expiresAt: 2 });
    });

    expect(result.current.session).toEqual({ accessToken: "new", refreshToken: "r2", expiresAt: 2 });
    expect(localStorage.getItem("session")).toBe(JSON.stringify({ accessToken: "new", refreshToken: "r2", expiresAt: 2 }));
  });

  it("clearSession resets state, clears storage, the spotify-required cache, and the query client", () => {
    localStorage.setItem("session", JSON.stringify({ accessToken: "abc", refreshToken: "r", expiresAt: 1 }));
    const { result } = renderHook(() => useSession(), { wrapper });

    act(() => {
      result.current.clearSession();
    });

    expect(result.current.session).toEqual({ accessToken: null, refreshToken: null, expiresAt: null });
    expect(localStorage.getItem("session")).toBeNull();
    expect(clearSpotifyRequiredCachedMock).toHaveBeenCalled();
    expect(clearQueryClientMock).toHaveBeenCalled();
  });
});
