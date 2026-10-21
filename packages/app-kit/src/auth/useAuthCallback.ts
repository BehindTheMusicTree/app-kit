"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorCode } from "../transport/app-errors/app-error-codes";
import { BackendError } from "../transport/app-errors/app-error";
import { GOOGLE_EXCHANGE_CONFIG, SPOTIFY_EXCHANGE_CONFIG, clearStoredRedirectUrl } from "./code-exchange";

export type AuthCallbackStatus = "pending" | "error";

export interface UseAuthCallbackOptions {
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
}

export type AuthCallbackState =
  | { status: null }
  | { status: "pending" }
  | { status: "error"; message: string | null; goHome: () => void };

/**
 * Handles OAuth callbacks at layout level: when the current pathname is a callback route, exchanges
 * the code and redirects. Callback pathnames, the code-exchange functions, and the error reporting
 * are injected so each consuming app supplies its own OAuth hooks and popup UI. `status` is null
 * when there is nothing to show.
 */
export function useAuthCallback({
  googleCallbackPathname = "/auth/google/callback",
  spotifyCallbackPathname = "/auth/spotify/callback",
  authToBackendFromGoogleCode,
  authToBackendFromSpotifyCode,
  onReauthRequired,
  onOAuthMisconfigured,
  onSpotifyAuthError,
}: UseAuthCallbackOptions): AuthCallbackState {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "handling" | "done" | "error">("idle");
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

  if (state === "handling") return { status: "pending" };
  if (state === "error") return { status: "error", message: errorMessage, goHome: () => router.replace("/") };
  return { status: null };
}
