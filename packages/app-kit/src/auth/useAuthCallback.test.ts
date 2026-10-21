import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const { routerReplaceMock, clearStoredRedirectUrlMock } = vi.hoisted(() => ({
  routerReplaceMock: vi.fn(),
  clearStoredRedirectUrlMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
}));

vi.mock("./code-exchange", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./code-exchange")>()),
  clearStoredRedirectUrl: clearStoredRedirectUrlMock,
}));

import { useAuthCallback } from "./useAuthCallback";
import { BackendError } from "../transport/app-errors/app-error";
import { ErrorCode } from "../transport/app-errors/app-error-codes";

function setUrl(pathname: string, search = "") {
  window.history.pushState({}, "", `${pathname}${search}`);
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    authToBackendFromGoogleCode: vi.fn(),
    authToBackendFromSpotifyCode: vi.fn(),
    onReauthRequired: vi.fn(),
    onOAuthMisconfigured: vi.fn(),
    onSpotifyAuthError: vi.fn(),
    ...overrides,
  };
}

describe("useAuthCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUrl("/");
  });

  it("renders nothing when the current path is not an auth callback", () => {
    const { result } = renderHook(() => useAuthCallback(makeProps()));

    expect(result.current).toEqual({ status: null });
  });

  describe("google callback", () => {
    it("shows an error when no authorization code is present", async () => {
      setUrl("/auth/google/callback");
      const { result } = renderHook(() => useAuthCallback(makeProps()));

      await waitFor(() =>
        expect(result.current).toMatchObject({
          status: "error",
          message: "No authorization code received from Google",
        }),
      );

      act(() => (result.current as { goHome: () => void }).goHome());
      expect(routerReplaceMock).toHaveBeenCalledWith("/");
    });

    it("shows the provider error when the query string carries an error param", async () => {
      setUrl("/auth/google/callback", "?error=access_denied");
      const { result } = renderHook(() => useAuthCallback(makeProps()));

      await waitFor(() =>
        expect(result.current).toMatchObject({ status: "error", message: "Google authentication failed: access_denied" }),
      );
    });

    it("exchanges the code and redirects on success", async () => {
      setUrl("/auth/google/callback", "?code=abc");
      const authToBackendFromGoogleCode = vi.fn().mockResolvedValue("/dashboard");
      renderHook(() => useAuthCallback(makeProps({ authToBackendFromGoogleCode })));

      await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/dashboard"));
      expect(authToBackendFromGoogleCode).toHaveBeenCalledWith("abc");
    });

    it("redirects home when the exchange resolves without a redirect url", async () => {
      setUrl("/auth/google/callback", "?code=abc");
      const authToBackendFromGoogleCode = vi.fn().mockResolvedValue(null);
      renderHook(() => useAuthCallback(makeProps({ authToBackendFromGoogleCode })));

      await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/"));
    });

    it("requires reauth and clears the stored redirect when the code is invalid or expired", async () => {
      setUrl("/auth/google/callback", "?code=abc");
      const onReauthRequired = vi.fn();
      const authToBackendFromGoogleCode = vi
        .fn()
        .mockRejectedValue(new BackendError(ErrorCode.BACKEND_GOOGLE_OAUTH_CODE_INVALID_OR_EXPIRED));
      renderHook(() => useAuthCallback(makeProps({ authToBackendFromGoogleCode, onReauthRequired })));

      await waitFor(() => expect(onReauthRequired).toHaveBeenCalled());
      expect(clearStoredRedirectUrlMock).toHaveBeenCalledWith("googleAuthRedirect");
      expect(routerReplaceMock).toHaveBeenCalledWith("/");
    });

    it("reports misconfiguration when the OAuth client is unauthorized", async () => {
      setUrl("/auth/google/callback", "?code=abc");
      const onOAuthMisconfigured = vi.fn();
      const authToBackendFromGoogleCode = vi
        .fn()
        .mockRejectedValue(new BackendError(ErrorCode.BACKEND_GOOGLE_OAUTH_UNAUTHORIZED_CLIENT));
      renderHook(() => useAuthCallback(makeProps({ authToBackendFromGoogleCode, onOAuthMisconfigured })));

      await waitFor(() =>
        expect(onOAuthMisconfigured).toHaveBeenCalledWith(ErrorCode.BACKEND_GOOGLE_OAUTH_UNAUTHORIZED_CLIENT),
      );
      expect(routerReplaceMock).toHaveBeenCalledWith("/");
    });

    it("shows the error message for any other Error thrown during exchange", async () => {
      setUrl("/auth/google/callback", "?code=abc");
      const authToBackendFromGoogleCode = vi.fn().mockRejectedValue(new Error("boom"));
      const { result } = renderHook(() => useAuthCallback(makeProps({ authToBackendFromGoogleCode })));

      await waitFor(() => expect(result.current).toMatchObject({ status: "error", message: "boom" }));
    });

    it("falls back to a default message for a non-Error rejection", async () => {
      const authToBackendFromGoogleCode = vi.fn().mockRejectedValue("nope");
      setUrl("/auth/google/callback", "?code=abc");
      const { result } = renderHook(() => useAuthCallback(makeProps({ authToBackendFromGoogleCode })));

      await waitFor(() => expect(result.current).toMatchObject({ status: "error", message: "Authentication failed" }));
    });

    it("reports pending while the exchange is in flight", async () => {
      setUrl("/auth/google/callback", "?code=abc");
      const authToBackendFromGoogleCode = vi.fn(() => new Promise<string | null>(() => {}));
      const { result } = renderHook(() => useAuthCallback(makeProps({ authToBackendFromGoogleCode })));

      await waitFor(() => expect(result.current).toEqual({ status: "pending" }));
    });

    it("uses a custom googleCallbackPathname", async () => {
      setUrl("/custom/google", "?code=abc");
      const authToBackendFromGoogleCode = vi.fn().mockResolvedValue("/home");
      renderHook(() =>
        useAuthCallback({ ...makeProps({ authToBackendFromGoogleCode }), googleCallbackPathname: "/custom/google" }),
      );

      await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/home"));
    });
  });

  describe("spotify callback", () => {
    it("reports an error via onSpotifyAuthError when no code is present", async () => {
      setUrl("/auth/spotify/callback");
      const onSpotifyAuthError = vi.fn();
      renderHook(() => useAuthCallback(makeProps({ onSpotifyAuthError })));

      await waitFor(() =>
        expect(onSpotifyAuthError).toHaveBeenCalledWith(
          "No authorization code received from Spotify",
          expect.any(Function),
        ),
      );

      const onClose = onSpotifyAuthError.mock.calls[0][1];
      onClose();
      expect(routerReplaceMock).toHaveBeenCalledWith("/");
    });

    it("reports the provider error message when an error param is present", async () => {
      setUrl("/auth/spotify/callback", "?error=denied");
      const onSpotifyAuthError = vi.fn();
      renderHook(() => useAuthCallback(makeProps({ onSpotifyAuthError })));

      await waitFor(() =>
        expect(onSpotifyAuthError).toHaveBeenCalledWith(
          "Spotify authentication failed: denied",
          expect.any(Function),
        ),
      );

      onSpotifyAuthError.mock.calls[0][1]();
      expect(routerReplaceMock).toHaveBeenCalledWith("/");
    });

    it("exchanges the code and redirects on success", async () => {
      setUrl("/auth/spotify/callback", "?code=xyz");
      const authToBackendFromSpotifyCode = vi.fn().mockResolvedValue("/library");
      renderHook(() => useAuthCallback(makeProps({ authToBackendFromSpotifyCode })));

      await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/library"));
      expect(authToBackendFromSpotifyCode).toHaveBeenCalledWith("xyz");
    });

    it("falls back to / when the exchange returns no redirect url", async () => {
      setUrl("/auth/spotify/callback", "?code=xyz");
      const authToBackendFromSpotifyCode = vi.fn().mockResolvedValue(null);
      renderHook(() => useAuthCallback(makeProps({ authToBackendFromSpotifyCode })));

      await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/"));
    });

    it("requires reauth and clears the stored redirect on invalid/expired code", async () => {
      setUrl("/auth/spotify/callback", "?code=xyz");
      const onReauthRequired = vi.fn();
      const authToBackendFromSpotifyCode = vi
        .fn()
        .mockRejectedValue(new BackendError(ErrorCode.BACKEND_SPOTIFY_OAUTH_CODE_INVALID_OR_EXPIRED));
      renderHook(() => useAuthCallback(makeProps({ authToBackendFromSpotifyCode, onReauthRequired })));

      await waitFor(() => expect(onReauthRequired).toHaveBeenCalled());
      expect(clearStoredRedirectUrlMock).toHaveBeenCalledWith("spotifyAuthRedirect");
      expect(routerReplaceMock).toHaveBeenCalledWith("/");
    });

    it("requires reauth on generic spotify authentication errors too", async () => {
      setUrl("/auth/spotify/callback", "?code=xyz");
      const onReauthRequired = vi.fn();
      const authToBackendFromSpotifyCode = vi
        .fn()
        .mockRejectedValue(new BackendError(ErrorCode.BACKEND_SPOTIFY_AUTHENTICATION_ERROR));
      renderHook(() => useAuthCallback(makeProps({ authToBackendFromSpotifyCode, onReauthRequired })));

      await waitFor(() => expect(onReauthRequired).toHaveBeenCalled());
    });

    it("reports misconfiguration when the Spotify client is invalid", async () => {
      setUrl("/auth/spotify/callback", "?code=xyz");
      const onOAuthMisconfigured = vi.fn();
      const authToBackendFromSpotifyCode = vi
        .fn()
        .mockRejectedValue(new BackendError(ErrorCode.BACKEND_SPOTIFY_OAUTH_INVALID_CLIENT));
      renderHook(() => useAuthCallback(makeProps({ authToBackendFromSpotifyCode, onOAuthMisconfigured })));

      await waitFor(() =>
        expect(onOAuthMisconfigured).toHaveBeenCalledWith(ErrorCode.BACKEND_SPOTIFY_OAUTH_INVALID_CLIENT),
      );
    });

    it("reports a generic backend-auth message for BACKEND_AUTH_ERROR", async () => {
      setUrl("/auth/spotify/callback", "?code=xyz");
      const onSpotifyAuthError = vi.fn();
      const authToBackendFromSpotifyCode = vi.fn().mockRejectedValue(new BackendError(ErrorCode.BACKEND_AUTH_ERROR));
      renderHook(() => useAuthCallback(makeProps({ authToBackendFromSpotifyCode, onSpotifyAuthError })));

      await waitFor(() =>
        expect(onSpotifyAuthError).toHaveBeenCalledWith(
          "Failed to authenticate with the backend server.",
          expect.any(Function),
        ),
      );
    });

    it("reports the backend error's own message for other BackendErrors", async () => {
      setUrl("/auth/spotify/callback", "?code=xyz");
      const onSpotifyAuthError = vi.fn();
      const authToBackendFromSpotifyCode = vi
        .fn()
        .mockRejectedValue(new BackendError(ErrorCode.BACKEND_SPOTIFY_USER_NOT_IN_ALLOWLIST, "not allowed"));
      renderHook(() => useAuthCallback(makeProps({ authToBackendFromSpotifyCode, onSpotifyAuthError })));

      await waitFor(() =>
        expect(onSpotifyAuthError).toHaveBeenCalledWith("not allowed", expect.any(Function)),
      );
    });

    it("reports a generic message for a non-BackendError rejection", async () => {
      setUrl("/auth/spotify/callback", "?code=xyz");
      const onSpotifyAuthError = vi.fn();
      const authToBackendFromSpotifyCode = vi.fn().mockRejectedValue(new Error("weird"));
      renderHook(() => useAuthCallback(makeProps({ authToBackendFromSpotifyCode, onSpotifyAuthError })));

      await waitFor(() =>
        expect(onSpotifyAuthError).toHaveBeenCalledWith("An unexpected error occurred.", expect.any(Function)),
      );

      onSpotifyAuthError.mock.calls[0][1]();
      expect(routerReplaceMock).toHaveBeenCalledWith("/");
    });

    it("uses a custom spotifyCallbackPathname", async () => {
      setUrl("/custom/spotify", "?code=xyz");
      const authToBackendFromSpotifyCode = vi.fn().mockResolvedValue("/home");
      renderHook(() => useAuthCallback({ ...makeProps({ authToBackendFromSpotifyCode }), spotifyCallbackPathname: "/custom/spotify" }));

      await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/home"));
    });
  });
});
