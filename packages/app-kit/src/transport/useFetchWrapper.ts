"use client";

import { useCallback } from "react";
import { useBackendRequest } from "./lib/use-backend-request";

/**
 * `getBackendBaseUrl` is supplied by the consuming app (e.g. a `site-urls.ts` built on top of
 * this package's `buildBackendBaseUrl`) rather than imported here, so this hook stays app-agnostic.
 *
 * Country-agnostic on purpose: a read whose response depends on the viewer's playback country must
 * go through `usePlaybackFetch`/`usePlaybackQuery` instead.
 */
export const useFetchWrapper = (getBackendBaseUrl: () => string) => {
  const { request } = useBackendRequest(getBackendBaseUrl);

  const fetch = useCallback(<T,>(
    backendEndpointOrUrl: string,
    fromBackend: boolean = true,
    requiresAuth: boolean = true,
    options: RequestInit = {},
    queryParams?: Record<string, string | number | boolean>,
    expectBinary: boolean = false,
    skipGlobalError: boolean = false,
  ) => {
    const isRead = (options.method ?? "GET").toUpperCase() === "GET";
    // Only the backend stamps `X-Playback-Country`, and only on country-dependent responses.
    const warnOnStampedRead = isRead && fromBackend && process.env.NODE_ENV !== "production"
      ? (response: Response) => {
        if (response.headers.get("x-playback-country") !== null) {
          console.error(
            `GET ${backendEndpointOrUrl} is country-dependent (X-Playback-Country) but was fetched without the playback context. Use usePlaybackQuery/usePlaybackFetch.`,
          );
        }
      }
      : undefined;
    return request<T>(backendEndpointOrUrl, fromBackend, requiresAuth, options, queryParams, expectBinary, skipGlobalError, warnOnStampedRead);
  }, [request]);

  return { fetch };
};
