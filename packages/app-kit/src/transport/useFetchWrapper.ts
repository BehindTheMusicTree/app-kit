"use client";

import { usePlaybackContext } from "./PlaybackContext";
import { useCallback } from "react";
import { useConnectivityError } from "./connectivity-error-context";
import { useSession } from "../auth/SessionContext";
import { BackendError, AuthRequired, ConnectivityError } from "./app-errors/app-error";
import { fetchWrapper as rawFetch } from "./fetch-wrapper";
import { createAppErrorFromErrorCode } from "./app-errors/app-error-factory";
import { ErrorCode } from "./app-errors/app-error-codes";

/**
 * `getBackendBaseUrl` is supplied by the consuming app (e.g. a `site-urls.ts` built on top of
 * this package's `buildBackendBaseUrl`) rather than imported here, so this hook stays app-agnostic.
 */
export const useFetchWrapper = (getBackendBaseUrl: () => string) => {
  const playback = usePlaybackContext();
  const { setConnectivityError } = useConnectivityError();
  const { clearSession, session, sessionRestored } = useSession();

  const handleError = useCallback((error: Error) => {
    if (error instanceof ConnectivityError) {
      const authDetailErrors = [
        ErrorCode.BACKEND_GOOGLE_OAUTH_CODE_INVALID_OR_EXPIRED,
        ErrorCode.BACKEND_SPOTIFY_USER_NOT_IN_ALLOWLIST,
        ErrorCode.BACKEND_SPOTIFY_AUTHENTICATION_ERROR,
        ErrorCode.BACKEND_GOOGLE_AUTHENTICATION_ERROR,
        ErrorCode.BACKEND_GOOGLE_OAUTH_MISCONFIGURED,
      ];
      if (error instanceof BackendError && authDetailErrors.includes(error.code)) {
        throw error;
      }
      if (error instanceof AuthRequired) {
        clearSession();
      }
      setConnectivityError(error);
      if (error instanceof BackendError && error.code === ErrorCode.BACKEND_SPOTIFY_AUTHORIZATION_REQUIRED) {
        throw error;
      }
    } else {
      throw error;
    }
  }, [clearSession, setConnectivityError]);

  const handleMissingRequiredSession = () => {
    if (!sessionRestored) return;
    setConnectivityError(createAppErrorFromErrorCode(ErrorCode.SESSION_REQUIRED));
  };

  const fetch = useCallback(<T,>(
    backendEndpointOrUrl: string,
    fromBackend: boolean = true,
    requiresAuth: boolean = true,
    options: RequestInit = {},
    queryParams?: Record<string, string | number | boolean>,
    expectBinary: boolean = false,
    skipGlobalError: boolean = false,
    acceptRefreshedContext: boolean = false,
  ) => {
    const baseUrl = getBackendBaseUrl().replace(/\/+$/, "");
    const endpointPath = String(backendEndpointOrUrl);
    if (fromBackend && endpointPath.startsWith("/")) {
      throw new Error(`Endpoint path must be relative (no leading slash). Got: "${endpointPath}".`);
    }
    const url = fromBackend ? (endpointPath ? `${baseUrl}/${endpointPath}` : baseUrl) : backendEndpointOrUrl;
    const perform = async (retryContextChange: boolean): Promise<T | null> => {
    const contextual = playback.key !== null && fromBackend && /^(?:me\/)?(library\/songs|genre-playlists|playlists|manual-playlists)\//.test(endpointPath);
    let requestContext = { key: playback.key, country: playback.country };
    if (contextual) {
      await playback.refresh();
      if (acceptRefreshedContext) requestContext = playback.snapshot();
      if (!playback.isCurrent(requestContext.key)) throw new DOMException("Playback context changed", "AbortError");
    }
    try {
    const result = await rawFetch<T>(
      url,
      requiresAuth,
      options,
      session?.accessToken || undefined,
      queryParams,
      handleMissingRequiredSession,
      skipGlobalError ? undefined : handleError,
      expectBinary,
      baseUrl,
      contextual ? async (response) => {
        const responseCountry = response.headers.get("x-playback-country");
        if (responseCountry !== null && responseCountry !== (requestContext.country ?? "unknown")) {
          await playback.refresh(true);
          throw new DOMException("Playback context changed", "AbortError");
        }
        if (!playback.isCurrent(requestContext.key)) throw new DOMException("Playback context changed", "AbortError");
      } : undefined,
    );
    if (contextual && !playback.isCurrent(requestContext.key)) throw new DOMException("Playback context changed", "AbortError");
    return result;
    } catch (error) {
      if (retryContextChange && contextual && error instanceof DOMException && error.name === "AbortError"
        && !playback.isCurrent(requestContext.key)) {
        return perform(false);
      }
      throw error;
    }
    };
    return perform(acceptRefreshedContext);
  }, [session?.accessToken, handleError, getBackendBaseUrl, sessionRestored, setConnectivityError, playback]);

  return { fetch };
};
