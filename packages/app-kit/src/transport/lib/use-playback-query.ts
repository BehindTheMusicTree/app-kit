"use client";

import type { QueryFunctionContext, UseQueryOptions } from "@tanstack/react-query";
import { useCallback } from "react";
import { z } from "zod";
import { usePlaybackContext } from "../PlaybackContext";
import { usePlaybackFetch } from "../usePlaybackFetch";
import { useQueryWithParse } from "./use-query-with-parse";

type PlaybackFetch = ReturnType<typeof usePlaybackFetch>["fetchBound"];

type UsePlaybackQueryOptions<T> = Omit<UseQueryOptions<T, Error, T>, "queryFn" | "queryKey" | "retry" | "retryDelay"> & {
  queryKey: readonly unknown[];
  getBackendBaseUrl: () => string;
  /** Receives `fetchBound`, which aborts if the playback context changed mid-flight. */
  queryFn: (fetchBound: PlaybackFetch, context: QueryFunctionContext) => Promise<unknown>;
  schema: z.ZodType<T, unknown>;
  context?: string;
  /** Consulted for every failure except the one stale-context retry this hook adds. */
  retry?: (failureCount: number, error: Error) => boolean;
};

/**
 * `useQueryWithParse` for country-dependent reads: appends `playback.key` to the key, waits for the
 * context to be ready, and retries once with no delay when a request was aborted as stale (which
 * also covers a country mismatch where the key does not change).
 */
export function usePlaybackQuery<T>({
  queryKey, getBackendBaseUrl, queryFn, enabled = true, retry, ...options
}: UsePlaybackQueryOptions<T>) {
  const playback = usePlaybackContext();
  const { fetchBound } = usePlaybackFetch(getBackendBaseUrl);
  const run = useCallback((context: QueryFunctionContext) => queryFn(fetchBound, context), [queryFn, fetchBound]);

  return useQueryWithParse({
    ...options,
    queryKey: [...queryKey, ...(playback.key ? [playback.key] : [])],
    queryFn: run,
    enabled: typeof enabled === "function" ? (query) => playback.ready && enabled(query) : enabled && playback.ready,
    retry: (failureCount, error) =>
      (failureCount < 1 && error instanceof DOMException && error.name === "AbortError")
      || (retry?.(failureCount, error) ?? false),
    retryDelay: 0,
  });
}
