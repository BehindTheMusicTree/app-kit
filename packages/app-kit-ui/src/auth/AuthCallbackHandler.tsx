"use client";

import { ReactNode } from "react";
import { useAuthCallback, type AuthCallbackState, type UseAuthCallbackOptions } from "@behindthemusictree/app-kit/auth";

export interface AuthCallbackHandlerProps extends UseAuthCallbackOptions {
  /** Optional custom "connecting…" / error UI; defaults to a minimal full-screen overlay. */
  renderStatus?: (state: Exclude<AuthCallbackState, { status: null }>) => ReactNode;
}

/** Handles OAuth callbacks at layout level. Rendered in the app shell so it runs on every load. */
export default function AuthCallbackHandler({ renderStatus, ...options }: AuthCallbackHandlerProps) {
  const state = useAuthCallback(options);

  if (state.status === null) return null;

  if (renderStatus) return <>{renderStatus(state)}</>;

  if (state.status === "error") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-neutral-100)] p-4">
        <div className="w-full max-w-md rounded-lg border border-[color-mix(in_srgb,var(--color-red-500)_20%,transparent)] bg-[color-mix(in_srgb,var(--color-red-500)_10%,transparent)] p-4">
          <h2 className="mb-2 font-semibold text-[var(--color-red-500)]">Authentication Error</h2>
          <p className="text-[color-mix(in_srgb,var(--color-red-500)_80%,transparent)]">{state.message}</p>
          <button
            type="button"
            onClick={state.goHome}
            className="mt-4 rounded bg-[var(--color-red-600)] px-4 py-2 text-white hover:bg-[var(--color-red-700)]"
          >
            Go to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-neutral-100)]" data-page="auth-callback-handler">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Connecting…</h1>
        <p className="text-[var(--color-neutral-600)]">Completing sign-in.</p>
      </div>
    </div>
  );
}
