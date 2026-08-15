import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReactNode } from "react";
import { AuthRequired, ErrorCode, ConnectivityErrorProvider, useConnectivityError } from "../transport";
import { PopupProvider, usePopup } from "./PopupContext";
import { ConnectivityErrorPopupRenderers, useConnectivityErrorPopup } from "./useConnectivityErrorPopup";

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

describe("useConnectivityErrorPopup", () => {
  it("routes AuthRequired to renderAuthPopup on a route that requires auth", () => {
    const renderers = makeRenderers();

    let setError!: (error: AuthRequired) => void;
    function SetErrorCapture({ children }: { children: ReactNode }) {
      const { setConnectivityError } = useConnectivityError();
      setError = setConnectivityError;
      return <>{children}</>;
    }

    render(
      <PopupProvider>
        <ConnectivityErrorProvider>
          <SetErrorCapture>
            <Consumer renderers={renderers} routeRequiresAuth />
          </SetErrorCapture>
        </ConnectivityErrorProvider>
      </PopupProvider>,
    );

    act(() => {
      setError(new AuthRequired(ErrorCode.BACKEND_UNAUTHORIZED));
    });

    expect(renderers.renderAuthPopup).toHaveBeenCalledTimes(1);
    expect(renderers.renderInternalErrorPopup).not.toHaveBeenCalled();
  });

  it("routes AuthRequired to renderInternalErrorPopup instead of dropping it silently on a route that does not require auth", () => {
    const renderers = makeRenderers();

    let setError!: (error: AuthRequired) => void;
    function SetErrorCapture({ children }: { children: ReactNode }) {
      const { setConnectivityError } = useConnectivityError();
      setError = setConnectivityError;
      return <>{children}</>;
    }

    render(
      <PopupProvider>
        <ConnectivityErrorProvider>
          <SetErrorCapture>
            <Consumer renderers={renderers} routeRequiresAuth={false} />
          </SetErrorCapture>
        </ConnectivityErrorProvider>
      </PopupProvider>,
    );

    act(() => {
      setError(new AuthRequired(ErrorCode.BACKEND_UNAUTHORIZED));
    });

    expect(renderers.renderInternalErrorPopup).toHaveBeenCalledTimes(1);
    expect(renderers.renderInternalErrorPopup).toHaveBeenCalledWith(ErrorCode.BACKEND_UNAUTHORIZED);
    expect(renderers.renderAuthPopup).not.toHaveBeenCalled();
  });

  it("hides the popup once the connectivity error clears", () => {
    const renderers = makeRenderers();

    let setError!: (error: AuthRequired | null) => void;
    let popupCtx!: ReturnType<typeof usePopup>;

    function SetErrorCapture({ children }: { children: ReactNode }) {
      const { setConnectivityError } = useConnectivityError();
      setError = setConnectivityError;
      return <>{children}</>;
    }

    function PopupCapture({ children }: { children: ReactNode }) {
      popupCtx = usePopup();
      return <>{children}</>;
    }

    render(
      <PopupProvider>
        <PopupCapture>
          <ConnectivityErrorProvider>
            <SetErrorCapture>
              <Consumer renderers={renderers} routeRequiresAuth={false} />
            </SetErrorCapture>
          </ConnectivityErrorProvider>
        </PopupCapture>
      </PopupProvider>,
    );

    act(() => {
      setError(new AuthRequired(ErrorCode.BACKEND_UNAUTHORIZED));
    });
    expect(popupCtx.activePopup).not.toBeNull();

    act(() => {
      setError(null);
    });
    expect(popupCtx.activePopup).toBeNull();
  });
});

function Consumer({
  renderers,
  routeRequiresAuth,
}: {
  renderers: ConnectivityErrorPopupRenderers;
  routeRequiresAuth: boolean;
}) {
  useConnectivityErrorPopup({ isAccountPage: false, routeRequiresAuth, routeRequiresSpotify: false, renderers });
  return null;
}
