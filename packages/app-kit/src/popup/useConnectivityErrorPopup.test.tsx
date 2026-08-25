import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReactNode } from "react";
import {
  AuthRequired,
  BackendError,
  BadRequestError,
  ConnectivityError,
  InvalidInputError,
  NetworkError,
  ServiceError,
} from "../transport/app-errors/app-error";
import { ErrorCode } from "../transport/app-errors/app-error-codes";
import { ConnectivityErrorProvider, useConnectivityError } from "../transport/connectivity-error-context";
import { PopupProvider, usePopup } from "./PopupContext";
import {
  ConnectivityErrorPopupRenderers,
  UseConnectivityErrorPopupOptions,
  useConnectivityErrorPopup,
} from "./useConnectivityErrorPopup";

function makeRenderers(): ConnectivityErrorPopupRenderers & Record<string, ReturnType<typeof vi.fn>> {
  return {
    renderAuthPopup: vi.fn(() => <div>auth-popup</div>),
    renderSpotifyOnlyAuthPopup: vi.fn(() => <div>spotify-only-auth-popup</div>),
    renderInternalErrorPopup: vi.fn(() => <div>internal-error-popup</div>),
    renderSpotifyAuthErrorPopup: vi.fn(() => <div>spotify-auth-error-popup</div>),
    renderGoogleAuthErrorPopup: vi.fn(() => <div>google-auth-error-popup</div>),
    renderNetworkErrorPopup: vi.fn(() => <div>network-error-popup</div>),
  };
}

type ConsumerOptions = Omit<UseConnectivityErrorPopupOptions, "renderers">;

const DEFAULT_OPTIONS: ConsumerOptions = {
  isAccountPage: false,
  routeRequiresAuth: false,
  routeRequiresSpotify: false,
};

function setupHarness(options: Partial<ConsumerOptions> = {}) {
  const renderers = makeRenderers();
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };

  let setError!: (error: ConnectivityError | null) => void;
  let popupCtx!: ReturnType<typeof usePopup>;

  function Capture({ children }: { children: ReactNode }) {
    const { setConnectivityError } = useConnectivityError();
    popupCtx = usePopup();
    setError = setConnectivityError;
    return <>{children}</>;
  }

  render(
    <PopupProvider>
      <ConnectivityErrorProvider>
        <Capture>
          <Consumer renderers={renderers} options={resolvedOptions} />
        </Capture>
      </ConnectivityErrorProvider>
    </PopupProvider>,
  );

  return {
    renderers,
    setError: (error: ConnectivityError | null) => act(() => setError(error)),
    getPopupCtx: () => popupCtx,
  };
}

describe("useConnectivityErrorPopup", () => {
  it("routes AuthRequired to renderAuthPopup on a route that requires auth", () => {
    const { renderers, setError } = setupHarness({ routeRequiresAuth: true });

    setError(new AuthRequired(ErrorCode.BACKEND_UNAUTHORIZED));

    expect(renderers.renderAuthPopup).toHaveBeenCalledTimes(1);
    expect(renderers.renderInternalErrorPopup).not.toHaveBeenCalled();
  });

  it("routes AuthRequired to renderInternalErrorPopup instead of dropping it silently on a route that does not require auth", () => {
    const { renderers, setError } = setupHarness({ routeRequiresAuth: false });

    setError(new AuthRequired(ErrorCode.BACKEND_UNAUTHORIZED));

    expect(renderers.renderInternalErrorPopup).toHaveBeenCalledTimes(1);
    expect(renderers.renderInternalErrorPopup).toHaveBeenCalledWith(ErrorCode.BACKEND_UNAUTHORIZED);
    expect(renderers.renderAuthPopup).not.toHaveBeenCalled();
  });

  it("hides the popup once the connectivity error clears", () => {
    const { setError, getPopupCtx } = setupHarness({ routeRequiresAuth: false });

    setError(new AuthRequired(ErrorCode.BACKEND_UNAUTHORIZED));
    expect(getPopupCtx().activePopup).not.toBeNull();

    setError(null);
    expect(getPopupCtx().activePopup).toBeNull();
  });

  it("routes a Spotify-authorization-required BackendError to renderSpotifyOnlyAuthPopup on a route that requires Spotify", () => {
    const { renderers, setError } = setupHarness({ routeRequiresSpotify: true });

    setError(new BackendError(ErrorCode.BACKEND_SPOTIFY_AUTHORIZATION_REQUIRED));

    expect(renderers.renderSpotifyOnlyAuthPopup).toHaveBeenCalledTimes(1);
  });

  it("routes InvalidInputError to renderInternalErrorPopup", () => {
    const { renderers, setError } = setupHarness();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    setError(new InvalidInputError(ErrorCode.BACKEND_INVALID_INPUT, { field: "name" }));

    expect(renderers.renderInternalErrorPopup).toHaveBeenCalledWith(ErrorCode.BACKEND_INVALID_INPUT);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("routes a Spotify allowlist BackendError to renderSpotifyAuthErrorPopup on a route that requires Spotify", () => {
    const { renderers, setError, getPopupCtx } = setupHarness({ routeRequiresSpotify: true });

    setError(new BackendError(ErrorCode.BACKEND_SPOTIFY_USER_NOT_IN_ALLOWLIST));

    expect(renderers.renderSpotifyAuthErrorPopup).toHaveBeenCalledTimes(1);

    const { onClose } = vi.mocked(renderers.renderSpotifyAuthErrorPopup).mock.calls[0][0];
    act(() => onClose());
    expect(getPopupCtx().activePopup).toBeNull();
  });

  it("hides the popup and clears the error for a Spotify allowlist BackendError on a route that does not require Spotify", () => {
    const { renderers, setError, getPopupCtx } = setupHarness({ routeRequiresSpotify: false });

    setError(new BackendError(ErrorCode.BACKEND_SPOTIFY_USER_NOT_IN_ALLOWLIST));

    expect(renderers.renderSpotifyAuthErrorPopup).not.toHaveBeenCalled();
    expect(getPopupCtx().activePopup).toBeNull();
  });

  it("routes a Google-authentication BackendError to renderGoogleAuthErrorPopup", () => {
    const { renderers, setError, getPopupCtx } = setupHarness();

    setError(new BackendError(ErrorCode.BACKEND_GOOGLE_AUTHENTICATION_ERROR));

    expect(renderers.renderGoogleAuthErrorPopup).toHaveBeenCalledTimes(1);

    const { onClose } = vi.mocked(renderers.renderGoogleAuthErrorPopup).mock.calls[0][0];
    act(() => onClose());
    expect(getPopupCtx().activePopup).toBeNull();
  });

  it("routes a plain BadRequestError to renderInternalErrorPopup", () => {
    const { renderers, setError } = setupHarness();

    setError(new BadRequestError(ErrorCode.BACKEND_BAD_REQUEST));

    expect(renderers.renderInternalErrorPopup).toHaveBeenCalledWith(ErrorCode.BACKEND_BAD_REQUEST);
  });

  it("routes a plain ServiceError to renderInternalErrorPopup", () => {
    const { renderers, setError } = setupHarness();

    setError(new ServiceError(ErrorCode.SERVICE_INTERNAL_ERROR));

    expect(renderers.renderInternalErrorPopup).toHaveBeenCalledWith(ErrorCode.SERVICE_INTERNAL_ERROR);
  });

  it("routes NetworkError to renderNetworkErrorPopup", () => {
    const { renderers, setError } = setupHarness();

    setError(new NetworkError(ErrorCode.NETWORK_ERROR));

    expect(renderers.renderNetworkErrorPopup).toHaveBeenCalledTimes(1);
  });

  it("does not redisplay the popup when the same error class repeats and is not in the always-redisplay list", () => {
    const { renderers, setError } = setupHarness({ routeRequiresAuth: true });

    setError(new AuthRequired(ErrorCode.BACKEND_UNAUTHORIZED));
    expect(renderers.renderAuthPopup).toHaveBeenCalledTimes(1);

    setError(new AuthRequired(ErrorCode.BACKEND_UNAUTHORIZED));
    expect(renderers.renderAuthPopup).toHaveBeenCalledTimes(1);
  });

  it("displays the new popup when a different error class follows one that is not in the always-redisplay list", () => {
    const { renderers, setError } = setupHarness({ routeRequiresAuth: true });

    setError(new AuthRequired(ErrorCode.BACKEND_UNAUTHORIZED));
    expect(renderers.renderAuthPopup).toHaveBeenCalledTimes(1);

    setError(new BadRequestError(ErrorCode.BACKEND_BAD_REQUEST));
    expect(renderers.renderInternalErrorPopup).toHaveBeenCalledWith(ErrorCode.BACKEND_BAD_REQUEST);
  });

  it("does not redisplay the popup when the same always-redisplay-listed error class repeats", () => {
    const { renderers, setError } = setupHarness();

    setError(new NetworkError(ErrorCode.NETWORK_ERROR));
    expect(renderers.renderNetworkErrorPopup).toHaveBeenCalledTimes(1);

    setError(new NetworkError(ErrorCode.NETWORK_ERROR));
    expect(renderers.renderNetworkErrorPopup).toHaveBeenCalledTimes(1);
  });
});

function Consumer({
  renderers,
  options,
}: {
  renderers: ConnectivityErrorPopupRenderers;
  options: ConsumerOptions;
}) {
  useConnectivityErrorPopup({ ...options, renderers });
  return null;
}
