"use client";

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

  const fetch = useCallback(<T>(
    backendEndpointOrUrl: string,
    fromBackend: boolean = true,
    requiresAuth: boolean = true,
    options: RequestInit = {},
    queryParams?: Record<string, string | number | boolean>,
    expectBinary: boolean = false,
    skipGlobalError: boolean = false,
  ) => {
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
      skipGlobalError ? undefined : handleError,
      expectBinary,
      baseUrl,
    );
  }, [session?.accessToken, handleError, getBackendBaseUrl, sessionRestored, setConnectivityError]);

  return { fetch };
};
