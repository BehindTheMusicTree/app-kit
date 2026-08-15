"use client";

import { ReactNode, useEffect, useRef } from "react";
import {
  AuthRequired,
  BackendError,
  BadRequestError,
  ClientError,
  ConnectivityError,
  ErrorCode,
  InvalidInputError,
  NetworkError,
  ServiceError,
  useConnectivityError,
} from "../transport";
import { AUTH_POPUP_TYPE, usePopup } from "./PopupContext";

export interface ConnectivityErrorPopupRenderers {
  renderAuthPopup: () => ReactNode;
  renderSpotifyOnlyAuthPopup: () => ReactNode;
  renderInternalErrorPopup: (errorCode: ErrorCode) => ReactNode;
  renderSpotifyAuthErrorPopup: (params: { message: string; errorCode: ErrorCode; onClose: () => void }) => ReactNode;
  renderGoogleAuthErrorPopup: (params: { message: string; onClose: () => void }) => ReactNode;
  renderNetworkErrorPopup: () => ReactNode;
}

export interface UseConnectivityErrorPopupOptions {
  isAccountPage: boolean;
  routeRequiresAuth: boolean;
  routeRequiresSpotify: boolean;
  renderers: ConnectivityErrorPopupRenderers;
}

const ALWAYS_REDISPLAY_ON_REPEAT = [NetworkError, BackendError, ClientError, ServiceError, InvalidInputError];

/**
 * Classifies the shared connectivity-error state into the right popup and shows it. Consuming apps
 * supply the actual popup components via `renderers` since those are app-branded; this hook owns
 * only the error -> popup-kind decision, so a fix here (e.g. a route not requiring auth still
 * surfacing an unexpected AuthRequired) applies to every app instead of needing a per-app patch.
 */
export function useConnectivityErrorPopup({
  isAccountPage,
  routeRequiresAuth,
  routeRequiresSpotify,
  renderers,
}: UseConnectivityErrorPopupOptions): void {
  const { showPopup, hidePopup } = usePopup();
  const { connectivityError, clearConnectivityError } = useConnectivityError();
  const currentConnectivityErrorRef = useRef<typeof ConnectivityError | null>(null);
  const renderersRef = useRef(renderers);
  renderersRef.current = renderers;

  useEffect(() => {
    if (connectivityError === null) {
      if (currentConnectivityErrorRef.current !== null) {
        currentConnectivityErrorRef.current = null;
        hidePopup();
      }
      return;
    }

    const error = connectivityError;
    const isSpotifyAllowlistOrAuthError =
      error instanceof BackendError &&
      [ErrorCode.BACKEND_SPOTIFY_USER_NOT_IN_ALLOWLIST, ErrorCode.BACKEND_SPOTIFY_AUTHENTICATION_ERROR].includes(
        error.code,
      );

    if (isSpotifyAllowlistOrAuthError && !routeRequiresSpotify) {
      hidePopup();
      clearConnectivityError();
      currentConnectivityErrorRef.current = null;
      return;
    }

    if (
      currentConnectivityErrorRef.current == null ||
      (!ALWAYS_REDISPLAY_ON_REPEAT.includes(currentConnectivityErrorRef.current) &&
        !(connectivityError instanceof currentConnectivityErrorRef.current))
    ) {
      const renderer = renderersRef.current;
      let popup: ReactNode | null = null;
      let popupType: string | null = null;

      if (!isAccountPage && routeRequiresAuth && error instanceof AuthRequired) {
        popup = renderer.renderAuthPopup();
        popupType = AUTH_POPUP_TYPE;
      } else if (
        !isAccountPage &&
        routeRequiresSpotify &&
        error instanceof BackendError &&
        error.code === ErrorCode.BACKEND_SPOTIFY_AUTHORIZATION_REQUIRED
      ) {
        popup = renderer.renderSpotifyOnlyAuthPopup();
        popupType = AUTH_POPUP_TYPE;
      } else if (error instanceof InvalidInputError) {
        console.error("[InvalidInputError]", error.code, error.json);
        popup = renderer.renderInternalErrorPopup(error.code);
      } else if (
        routeRequiresSpotify &&
        error instanceof BackendError &&
        [ErrorCode.BACKEND_SPOTIFY_USER_NOT_IN_ALLOWLIST, ErrorCode.BACKEND_SPOTIFY_AUTHENTICATION_ERROR].includes(
          error.code,
        )
      ) {
        popup = renderer.renderSpotifyAuthErrorPopup({
          message: error.message,
          errorCode: error.code,
          onClose: () => hidePopup(),
        });
      } else if (
        error instanceof BackendError &&
        [
          ErrorCode.BACKEND_GOOGLE_AUTHENTICATION_ERROR,
          ErrorCode.BACKEND_GOOGLE_OAUTH_MISCONFIGURED,
          ErrorCode.BACKEND_GOOGLE_OAUTH_CODE_INVALID_OR_EXPIRED,
        ].includes(error.code)
      ) {
        popup = renderer.renderGoogleAuthErrorPopup({ message: error.message, onClose: () => hidePopup() });
      } else if (
        error instanceof BadRequestError ||
        error instanceof BackendError ||
        error instanceof ServiceError ||
        error instanceof AuthRequired
      ) {
        // AuthRequired reaches here when the route doesn't require a session (e.g. a public
        // reference page) or is the account page, so the AuthPopup branch above didn't fire —
        // an unexpected 401 on those routes still needs to surface, not be dropped silently.
        popup = renderer.renderInternalErrorPopup(error.code);
      } else if (error instanceof NetworkError) {
        popup = renderer.renderNetworkErrorPopup();
      }

      if (popup) {
        showPopup(popup, popupType);
      }

      currentConnectivityErrorRef.current = error.constructor as typeof ConnectivityError;
    }
  }, [
    connectivityError,
    showPopup,
    hidePopup,
    clearConnectivityError,
    isAccountPage,
    routeRequiresAuth,
    routeRequiresSpotify,
  ]);
}
