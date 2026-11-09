"use client";

import { useCallback } from "react";
import { usePlaybackContext } from "./PlaybackContext";
import { useBackendRequest } from "./lib/use-backend-request";

const stale = () => new DOMException("Playback context changed", "AbortError");

/**
 * Fetches for responses that depend on the viewer's playback country. Same positional arguments as
 * `useFetchWrapper`'s `fetch`.
 *
 * - `fetchBound`: tied to the context of the render that created it; aborts (AbortError) if the
 *   context changed meanwhile. For queries, whose key carries `playback.key` and so re-runs.
 * - `fetchLatest`: adopts the refreshed context and retries once on a mismatch. For explicit play
 *   intents that have no query key to re-run them.
 */
export const usePlaybackFetch = (getBackendBaseUrl: () => string) => {
  const playback = usePlaybackContext();
  const { request } = useBackendRequest(getBackendBaseUrl);

  const run = useCallback(<T,>(
    adoptRefreshed: boolean,
    backendEndpointOrUrl: string,
    fromBackend: boolean,
    requiresAuth: boolean,
    options: RequestInit,
    queryParams: Record<string, string | number | boolean> | undefined,
    expectBinary: boolean,
    skipGlobalError: boolean,
  ) => {
    const perform = async (retryContextChange: boolean): Promise<T | null> => {
      let requestContext = { key: playback.key, country: playback.country };
      await playback.refresh();
      if (adoptRefreshed) requestContext = playback.snapshot();
      if (!playback.isCurrent(requestContext.key)) throw stale();
      try {
        const result = await request<T>(
          backendEndpointOrUrl, fromBackend, requiresAuth, options, queryParams, expectBinary, skipGlobalError,
          async (response) => {
            const responseCountry = response.headers.get("x-playback-country");
            if (responseCountry !== null && responseCountry !== (requestContext.country ?? "unknown")) {
              await playback.refresh(true);
              throw stale();
            }
            if (!playback.isCurrent(requestContext.key)) throw stale();
          },
        );
        if (!playback.isCurrent(requestContext.key)) throw stale();
        return result;
      } catch (error) {
        if (retryContextChange && error instanceof DOMException && error.name === "AbortError"
          && !playback.isCurrent(requestContext.key)) {
          return perform(false);
        }
        throw error;
      }
    };
    return perform(adoptRefreshed);
  }, [playback, request]);

  const fetchBound = useCallback(<T,>(
    backendEndpointOrUrl: string,
    fromBackend: boolean = true,
    requiresAuth: boolean = true,
    options: RequestInit = {},
    queryParams?: Record<string, string | number | boolean>,
    expectBinary: boolean = false,
    skipGlobalError: boolean = false,
  ) => run<T>(false, backendEndpointOrUrl, fromBackend, requiresAuth, options, queryParams, expectBinary, skipGlobalError), [run]);

  const fetchLatest = useCallback(<T,>(
    backendEndpointOrUrl: string,
    fromBackend: boolean = true,
    requiresAuth: boolean = true,
    options: RequestInit = {},
    queryParams?: Record<string, string | number | boolean>,
    expectBinary: boolean = false,
    skipGlobalError: boolean = false,
  ) => run<T>(true, backendEndpointOrUrl, fromBackend, requiresAuth, options, queryParams, expectBinary, skipGlobalError), [run]);

  return { fetchBound, fetchLatest };
};
