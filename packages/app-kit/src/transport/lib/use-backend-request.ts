"use client";

import { useCallback } from "react";
import { useConnectivityError } from "../connectivity-error-context";
import { useSession } from "../../auth/SessionContext";
import { BackendError, AuthRequired, ConnectivityError, isNotFoundError } from "../app-errors/app-error";
import { fetchWrapper as rawFetch } from "../fetch-wrapper";
import { createAppErrorFromErrorCode } from "../app-errors/app-error-factory";
import { ErrorCode } from "../app-errors/app-error-codes";

export type ResponseHook = (response: Response) => void | Promise<void>;

/**
 * Shared request path behind `useFetchWrapper` and `usePlaybackFetch`: auth, error handling and URL
 * building, with an optional per-request `onResponse` hook. Knows nothing about playback.
 */
export const useBackendRequest = (getBackendBaseUrl: () => string) => {
  const { setConnectivityError } = useConnectivityError();
  const { clearSession, session, sessionRestored } = useSession();

  const handleError = useCallback((error: Error, isRead: boolean) => {
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
      // A missing resource is the reader's state to show, not a connectivity failure. A write that
      // hits a 404 is unexpected, so it still raises the popup.
      if (isRead && isNotFoundError(error)) {
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

  const request = useCallback(<T,>(
    backendEndpointOrUrl: string,
    fromBackend: boolean = true,
    requiresAuth: boolean = true,
    options: RequestInit = {},
    queryParams?: Record<string, string | number | boolean>,
    expectBinary: boolean = false,
    skipGlobalError: boolean = false,
    onResponse?: ResponseHook,
  ) => {
    const isRead = (options.method ?? "GET").toUpperCase() === "GET";
    const baseUrl = getBackendBaseUrl().replace(/\/+$/, "");
    const endpointPath = String(backendEndpointOrUrl);
    if (fromBackend && endpointPath.startsWith("/")) {
      throw new Error(`Endpoint path must be relative (no leading slash). Got: "${endpointPath}".`);
    }
    const url = fromBackend ? (endpointPath ? `${baseUrl}/${endpointPath}` : baseUrl) : backendEndpointOrUrl;
    return rawFetch<T>(
      url,
      requiresAuth,
      options,
      session?.accessToken || undefined,
      queryParams,
      handleMissingRequiredSession,
      skipGlobalError ? undefined : (error: Error) => handleError(error, isRead),
      expectBinary,
      baseUrl,
      onResponse,
    );
  }, [session?.accessToken, handleError, getBackendBaseUrl, sessionRestored, setConnectivityError]);

  return { request };
};
