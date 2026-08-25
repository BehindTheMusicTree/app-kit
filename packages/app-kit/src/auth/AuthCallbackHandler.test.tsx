import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const { routerReplaceMock, clearStoredRedirectUrlMock } = vi.hoisted(() => ({
  routerReplaceMock: vi.fn(),
  clearStoredRedirectUrlMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
}));

vi.mock("./code-exchange", async () => {
  const actual = await vi.importActual<typeof import("./code-exchange")>("./code-exchange");
  return { ...actual, clearStoredRedirectUrl: clearStoredRedirectUrlMock };
});

import AuthCallbackHandler from "./AuthCallbackHandler";
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

describe("AuthCallbackHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUrl("/");
  });

  it("renders nothing when the current path is not an auth callback", () => {
    const { container } = render(<AuthCallbackHandler {...makeProps()} />);

    expect(container).toBeEmptyDOMElement();
  });

  describe("google callback", () => {
    it("shows an error when no authorization code is present", async () => {
      setUrl("/auth/google/callback");
      render(<AuthCallbackHandler {...makeProps()} />);

      await waitFor(() =>
        expect(screen.getByText("No authorization code received from Google")).toBeInTheDocument(),
      );
      expect(screen.getByText("Authentication Error")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Go to home" }));
      expect(routerReplaceMock).toHaveBeenCalledWith("/");
    });

    it("shows the provider error when the query string carries an error param", async () => {
      setUrl("/auth/google/callback", "?error=access_denied");
      render(<AuthCallbackHandler {...makeProps()} />);

      await waitFor(() =>
        expect(screen.getByText("Google authentication failed: access_denied")).toBeInTheDocument(),
      );
    });

    it("exchanges the code and redirects on success", async () => {
      setUrl("/auth/google/callback", "?code=abc");
      const authToBackendFromGoogleCode = vi.fn().mockResolvedValue("/dashboard");
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromGoogleCode })} />);

      await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/dashboard"));
      expect(authToBackendFromGoogleCode).toHaveBeenCalledWith("abc");
    });

    it("redirects home when the exchange resolves without a redirect url", async () => {
      setUrl("/auth/google/callback", "?code=abc");
      const authToBackendFromGoogleCode = vi.fn().mockResolvedValue(null);
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromGoogleCode })} />);

      await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/"));
    });

    it("requires reauth and clears the stored redirect when the code is invalid or expired", async () => {
      setUrl("/auth/google/callback", "?code=abc");
      const onReauthRequired = vi.fn();
      const authToBackendFromGoogleCode = vi
        .fn()
        .mockRejectedValue(new BackendError(ErrorCode.BACKEND_GOOGLE_OAUTH_CODE_INVALID_OR_EXPIRED));
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromGoogleCode, onReauthRequired })} />);

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
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromGoogleCode, onOAuthMisconfigured })} />);

      await waitFor(() =>
        expect(onOAuthMisconfigured).toHaveBeenCalledWith(ErrorCode.BACKEND_GOOGLE_OAUTH_UNAUTHORIZED_CLIENT),
      );
      expect(routerReplaceMock).toHaveBeenCalledWith("/");
    });

    it("shows the error message for any other Error thrown during exchange", async () => {
      setUrl("/auth/google/callback", "?code=abc");
      const authToBackendFromGoogleCode = vi.fn().mockRejectedValue(new Error("boom"));
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromGoogleCode })} />);

      await waitFor(() => expect(screen.getByText("boom")).toBeInTheDocument());
    });

    it("falls back to a default message for a non-Error rejection", async () => {
      const authToBackendFromGoogleCode = vi.fn().mockRejectedValue("nope");
      setUrl("/auth/google/callback", "?code=abc");
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromGoogleCode })} />);

      await waitFor(() => expect(screen.getByText("Authentication failed")).toBeInTheDocument());
    });

    it("renders custom status UI via renderStatus while handling", async () => {
      setUrl("/auth/google/callback", "?code=abc");
      const authToBackendFromGoogleCode = vi.fn(() => new Promise(() => {}));
      const renderStatus = vi.fn(() => <div>Custom loading…</div>);
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromGoogleCode, renderStatus })} />);

      await waitFor(() => expect(screen.getByText("Custom loading…")).toBeInTheDocument());
    });

    it("uses a custom googleCallbackPathname", async () => {
      setUrl("/custom/google", "?code=abc");
      const authToBackendFromGoogleCode = vi.fn().mockResolvedValue("/home");
      render(
        <AuthCallbackHandler
          {...makeProps({ authToBackendFromGoogleCode })}
          googleCallbackPathname="/custom/google"
        />,
      );

      await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/home"));
    });
  });

  describe("spotify callback", () => {
    it("reports an error via onSpotifyAuthError when no code is present", async () => {
      setUrl("/auth/spotify/callback");
      const onSpotifyAuthError = vi.fn();
      render(<AuthCallbackHandler {...makeProps({ onSpotifyAuthError })} />);

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
      render(<AuthCallbackHandler {...makeProps({ onSpotifyAuthError })} />);

      await waitFor(() =>
        expect(onSpotifyAuthError).toHaveBeenCalledWith(
          "Spotify authentication failed: denied",
          expect.any(Function),
        ),
      );
    });

    it("exchanges the code and redirects on success", async () => {
      setUrl("/auth/spotify/callback", "?code=xyz");
      const authToBackendFromSpotifyCode = vi.fn().mockResolvedValue("/library");
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromSpotifyCode })} />);

      await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/library"));
      expect(authToBackendFromSpotifyCode).toHaveBeenCalledWith("xyz");
    });

    it("requires reauth and clears the stored redirect on invalid/expired code", async () => {
      setUrl("/auth/spotify/callback", "?code=xyz");
      const onReauthRequired = vi.fn();
      const authToBackendFromSpotifyCode = vi
        .fn()
        .mockRejectedValue(new BackendError(ErrorCode.BACKEND_SPOTIFY_OAUTH_CODE_INVALID_OR_EXPIRED));
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromSpotifyCode, onReauthRequired })} />);

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
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromSpotifyCode, onReauthRequired })} />);

      await waitFor(() => expect(onReauthRequired).toHaveBeenCalled());
    });

    it("reports misconfiguration when the Spotify client is invalid", async () => {
      setUrl("/auth/spotify/callback", "?code=xyz");
      const onOAuthMisconfigured = vi.fn();
      const authToBackendFromSpotifyCode = vi
        .fn()
        .mockRejectedValue(new BackendError(ErrorCode.BACKEND_SPOTIFY_OAUTH_INVALID_CLIENT));
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromSpotifyCode, onOAuthMisconfigured })} />);

      await waitFor(() =>
        expect(onOAuthMisconfigured).toHaveBeenCalledWith(ErrorCode.BACKEND_SPOTIFY_OAUTH_INVALID_CLIENT),
      );
    });

    it("reports a generic backend-auth message for BACKEND_AUTH_ERROR", async () => {
      setUrl("/auth/spotify/callback", "?code=xyz");
      const onSpotifyAuthError = vi.fn();
      const authToBackendFromSpotifyCode = vi.fn().mockRejectedValue(new BackendError(ErrorCode.BACKEND_AUTH_ERROR));
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromSpotifyCode, onSpotifyAuthError })} />);

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
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromSpotifyCode, onSpotifyAuthError })} />);

      await waitFor(() =>
        expect(onSpotifyAuthError).toHaveBeenCalledWith("not allowed", expect.any(Function)),
      );
    });

    it("reports a generic message for a non-BackendError rejection", async () => {
      setUrl("/auth/spotify/callback", "?code=xyz");
      const onSpotifyAuthError = vi.fn();
      const authToBackendFromSpotifyCode = vi.fn().mockRejectedValue(new Error("weird"));
      render(<AuthCallbackHandler {...makeProps({ authToBackendFromSpotifyCode, onSpotifyAuthError })} />);

      await waitFor(() =>
        expect(onSpotifyAuthError).toHaveBeenCalledWith("An unexpected error occurred.", expect.any(Function)),
      );
    });

    it("uses a custom spotifyCallbackPathname", async () => {
      setUrl("/custom/spotify", "?code=xyz");
      const authToBackendFromSpotifyCode = vi.fn().mockResolvedValue("/home");
      render(
        <AuthCallbackHandler
          {...makeProps({ authToBackendFromSpotifyCode })}
          spotifyCallbackPathname="/custom/spotify"
        />,
      );

      await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/home"));
    });
  });
});
