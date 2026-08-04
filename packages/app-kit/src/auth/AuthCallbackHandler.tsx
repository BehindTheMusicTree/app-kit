"use client";

/**
 * Handles OAuth callbacks at layout level. Rendered in the app shell so it runs on every load.
 *
 * Generalized from grow-the-music-tree-frontend's original (hardcoded `/auth/google/callback` and
 * `/auth/spotify/callback` pathnames, and direct imports of grow's `useSpotifyAuth`/`useGoogleAuth`
 * hooks and its `AuthPopup`/`InternalErrorPopup`/`SpotifyAuthErrorPopup` popup components — none of
 * which are part of this package): callback pathnames, the code-exchange functions, and all popup
 * rendering are now injected props, so each consuming app supplies its own OAuth hooks (env-var-based
 * client IDs/redirect URIs) and its own popup UI.
 */

import { useEffect, useRef, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ErrorCode } from "../transport/app-errors/app-error-codes";
import { BackendError } from "../transport/app-errors/app-error";
import { GOOGLE_EXCHANGE_CONFIG, SPOTIFY_EXCHANGE_CONFIG, clearStoredRedirectUrl } from "./code-exchange";

type CallbackState = "idle" | "handling" | "done" | "error";

export interface AuthCallbackHandlerProps {
  /** Defaults to `/auth/google/callback`. */
  googleCallbackPathname?: string;
  /** Defaults to `/auth/spotify/callback`. */
  spotifyCallbackPathname?: string;
  authToBackendFromGoogleCode: (code: string) => Promise<string | null>;
  authToBackendFromSpotifyCode: (code: string) => Promise<string | null>;
  /** Called when a previously-used/expired auth code requires the user to sign in again. */
  onReauthRequired: () => void;
  /** Called when the backend reports the OAuth client itself is misconfigured. */
  onOAuthMisconfigured: (errorCode: ErrorCode) => void;
  /** Called for Spotify-specific auth errors (missing/invalid code, generic failure). */
  onSpotifyAuthError: (message: string, onClose: () => void) => void;
  /** Optional custom "connecting…" / error UI; defaults to a minimal full-screen overlay. */
  renderStatus?: (state: Extract<CallbackState, "handling" | "error">, errorMessage: string | null) => ReactNode;
}

export default function AuthCallbackHandler({
  googleCallbackPathname = "/auth/google/callback",
  spotifyCallbackPathname = "/auth/spotify/callback",
  authToBackendFromGoogleCode,
  authToBackendFromSpotifyCode,
  onReauthRequired,
  onOAuthMisconfigured,
  onSpotifyAuthError,
  renderStatus,
}: AuthCallbackHandlerProps) {
  const router = useRouter();
  const [state, setState] = useState<CallbackState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || handled.current) return;

    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorParam = params.get("error");

    const isGoogleCallback = pathname === googleCallbackPathname;
    const isSpotifyCallback = pathname === spotifyCallbackPathname;

    if (!isGoogleCallback && !isSpotifyCallback) return;

    handled.current = true;
    setState("handling");

    const runGoogle = async () => {
      if (errorParam) {
        setErrorMessage(`Google authentication failed: ${errorParam}`);
        setState("error");
        return;
      }
      if (!code) {
        setErrorMessage("No authorization code received from Google");
        setState("error");
        return;
      }
      try {
        const redirectUrl = await authToBackendFromGoogleCode(code);
        setState("done");
        router.replace(redirectUrl || "/");
      } catch (err) {
        if (err instanceof BackendError && err.code === ErrorCode.BACKEND_GOOGLE_OAUTH_CODE_INVALID_OR_EXPIRED) {
          clearStoredRedirectUrl(GOOGLE_EXCHANGE_CONFIG.redirectStorageKey);
          onReauthRequired();
          router.replace("/");
        } else if (err instanceof BackendError && err.code === ErrorCode.BACKEND_GOOGLE_OAUTH_UNAUTHORIZED_CLIENT) {
          onOAuthMisconfigured(err.code);
          router.replace("/");
        } else {
          setErrorMessage(err instanceof Error ? err.message : "Authentication failed");
          setState("error");
        }
      }
    };

    const runSpotify = async () => {
      if (errorParam) {
        onSpotifyAuthError(`Spotify authentication failed: ${errorParam}`, () => router.replace("/"));
        setState("done");
        return;
      }
      if (!code) {
        onSpotifyAuthError("No authorization code received from Spotify", () => router.replace("/"));
        setState("done");
        return;
      }
      try {
        const redirectUrl = await authToBackendFromSpotifyCode(code);
        setState("done");
        router.replace(redirectUrl || "/");
      } catch (err) {
        if (
          err instanceof BackendError &&
          (err.code === ErrorCode.BACKEND_SPOTIFY_OAUTH_CODE_INVALID_OR_EXPIRED ||
            err.code === ErrorCode.BACKEND_SPOTIFY_AUTHENTICATION_ERROR)
        ) {
          clearStoredRedirectUrl(SPOTIFY_EXCHANGE_CONFIG.redirectStorageKey);
          onReauthRequired();
          router.replace("/");
        } else if (err instanceof BackendError && err.code === ErrorCode.BACKEND_SPOTIFY_OAUTH_INVALID_CLIENT) {
          onOAuthMisconfigured(err.code);
          router.replace("/");
        } else {
          const message =
            err instanceof BackendError
              ? err.code === ErrorCode.BACKEND_AUTH_ERROR
                ? "Failed to authenticate with the backend server."
                : err.message
              : "An unexpected error occurred.";
          onSpotifyAuthError(message, () => router.replace("/"));
        }
        setState("done");
      }
    };

    if (isGoogleCallback) runGoogle();
    else runSpotify();
  }, [
    googleCallbackPathname,
    spotifyCallbackPathname,
    authToBackendFromGoogleCode,
    authToBackendFromSpotifyCode,
    onReauthRequired,
    onOAuthMisconfigured,
    onSpotifyAuthError,
    router,
  ]);

  if (state === "idle" || state === "done") return null;

  if (renderStatus) return <>{renderStatus(state, errorMessage)}</>;

  if (state === "error") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <h2 className="mb-2 font-semibold text-red-500">Authentication Error</h2>
          <p className="text-red-500/80">{errorMessage}</p>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Go to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-100" data-page="auth-callback-handler">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Connecting…</h1>
        <p className="text-gray-600">Completing sign-in.</p>
      </div>
    </div>
  );
}
