import { describe, it, expect, beforeEach, vi } from "vitest";
import { BackendError } from "../transport/app-errors/app-error";
import { ErrorCode } from "../transport/app-errors/app-error-codes";

const { createAppErrorFromErrorCodeMock } = vi.hoisted(() => ({
  createAppErrorFromErrorCodeMock: vi.fn(),
}));

vi.mock("../transport/app-errors/app-error-factory", () => ({
  createAppErrorFromErrorCode: (...args: unknown[]) => createAppErrorFromErrorCodeMock(...args),
}));

import {
  exchangeCodeWithBackend,
  resolveRedirectUri,
  storeRedirectUrl,
  clearStoredRedirectUrl,
  createLogout,
  SPOTIFY_EXCHANGE_CONFIG,
  GOOGLE_EXCHANGE_CONFIG,
} from "./code-exchange";

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

Object.defineProperty(window, "localStorage", { value: new MemoryStorage(), writable: true });

describe("code-exchange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    createAppErrorFromErrorCodeMock.mockReturnValue(new BackendError(ErrorCode.BACKEND_AUTH_ERROR));
  });

  describe("exchangeCodeWithBackend", () => {
    it("sets the session and returns '/' when there is no stored redirect", async () => {
      const fetchAuth = vi.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r", expiresAt: 123 });
      const setSession = vi.fn();
      const setConnectivityError = vi.fn();

      const result = await exchangeCodeWithBackend(
        fetchAuth,
        setSession,
        setConnectivityError,
        SPOTIFY_EXCHANGE_CONFIG,
        "code123",
      );

      expect(fetchAuth).toHaveBeenCalledWith("auth/spotify/", true, false, {
        method: "POST",
        body: JSON.stringify({ code: "code123" }),
      });
      expect(setSession).toHaveBeenCalledWith({ accessToken: "a", refreshToken: "r", expiresAt: 123 });
      expect(result).toBe("/");
    });

    it("returns the stored redirect's path and search, and clears storage", async () => {
      window.localStorage.setItem("spotifyAuthRedirect", "https://example.com/genre-tree?scope=me");
      const fetchAuth = vi.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r", expiresAt: 123 });

      const result = await exchangeCodeWithBackend(
        fetchAuth,
        vi.fn(),
        vi.fn(),
        SPOTIFY_EXCHANGE_CONFIG,
        "code123",
      );

      expect(result).toBe("/genre-tree?scope=me");
      expect(window.localStorage.getItem("spotifyAuthRedirect")).toBeNull();
    });

    it("falls back to '/' when the stored redirect is not a valid URL", async () => {
      window.localStorage.setItem("spotifyAuthRedirect", "not-a-url");
      const fetchAuth = vi.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r", expiresAt: 123 });

      const result = await exchangeCodeWithBackend(
        fetchAuth,
        vi.fn(),
        vi.fn(),
        SPOTIFY_EXCHANGE_CONFIG,
        "code123",
      );

      expect(result).toBe("/");
    });

    it("sets a backend auth error and returns null when the response is falsy", async () => {
      const fetchAuth = vi.fn().mockResolvedValue(null);
      const setConnectivityError = vi.fn();

      const result = await exchangeCodeWithBackend(
        fetchAuth,
        vi.fn(),
        setConnectivityError,
        SPOTIFY_EXCHANGE_CONFIG,
        "code123",
      );

      expect(createAppErrorFromErrorCodeMock).toHaveBeenCalledWith(ErrorCode.BACKEND_AUTH_ERROR);
      expect(setConnectivityError).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("rethrows a BackendError whose code is in the config's rethrowErrorCodes", async () => {
      const error = new BackendError(ErrorCode.BACKEND_SPOTIFY_USER_NOT_IN_ALLOWLIST);
      const fetchAuth = vi.fn().mockRejectedValue(error);

      await expect(
        exchangeCodeWithBackend(fetchAuth, vi.fn(), vi.fn(), SPOTIFY_EXCHANGE_CONFIG, "code123"),
      ).rejects.toBe(error);
    });

    it("swallows a BackendError whose code is not in the config's rethrowErrorCodes", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new BackendError(ErrorCode.BACKEND_AUTH_ERROR);
      const fetchAuth = vi.fn().mockRejectedValue(error);
      const setConnectivityError = vi.fn();

      const result = await exchangeCodeWithBackend(
        fetchAuth,
        vi.fn(),
        setConnectivityError,
        SPOTIFY_EXCHANGE_CONFIG,
        "code123",
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith("[auth] exchangeCodeWithBackend error", error);
      expect(setConnectivityError).toHaveBeenCalled();
      expect(result).toBeNull();
      consoleErrorSpy.mockRestore();
    });

    it("swallows a non-BackendError thrown from fetchAuth", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("boom");
      const fetchAuth = vi.fn().mockRejectedValue(error);
      const setConnectivityError = vi.fn();

      const result = await exchangeCodeWithBackend(
        fetchAuth,
        vi.fn(),
        setConnectivityError,
        GOOGLE_EXCHANGE_CONFIG,
        "code123",
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith("[auth] exchangeCodeWithBackend error", error);
      expect(setConnectivityError).toHaveBeenCalled();
      expect(result).toBeNull();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("resolveRedirectUri", () => {
    it("returns the value unchanged when it already starts with http", () => {
      expect(resolveRedirectUri("https://example.com/callback")).toBe("https://example.com/callback");
    });

    it("prefixes the origin when the value starts with a slash", () => {
      expect(resolveRedirectUri("/callback")).toBe(`${window.location.origin}/callback`);
    });

    it("prefixes the origin and a slash when the value has neither", () => {
      expect(resolveRedirectUri("callback")).toBe(`${window.location.origin}/callback`);
    });
  });

  describe("storeRedirectUrl", () => {
    it("stores the origin plus path when the path starts with a slash", () => {
      storeRedirectUrl("myKey", "/genre-tree");

      expect(window.localStorage.getItem("myKey")).toBe(`${window.location.origin}/genre-tree`);
    });

    it("stores the origin plus a slash plus path when the path lacks a leading slash", () => {
      storeRedirectUrl("myKey", "genre-tree");

      expect(window.localStorage.getItem("myKey")).toBe(`${window.location.origin}/genre-tree`);
    });

    it("stores window.location.href when no path is given", () => {
      storeRedirectUrl("myKey");

      expect(window.localStorage.getItem("myKey")).toBe(window.location.href);
    });
  });

  describe("clearStoredRedirectUrl", () => {
    it("removes the stored key from localStorage", () => {
      window.localStorage.setItem("myKey", "value");

      clearStoredRedirectUrl("myKey");

      expect(window.localStorage.getItem("myKey")).toBeNull();
    });
  });

  describe("createLogout", () => {
    it("returns a function that clears the connectivity error and the session", () => {
      const clearConnectivityError = vi.fn();
      const clearSession = vi.fn();

      const logout = createLogout(clearConnectivityError, clearSession);
      logout();

      expect(clearConnectivityError).toHaveBeenCalled();
      expect(clearSession).toHaveBeenCalled();
    });
  });
});
