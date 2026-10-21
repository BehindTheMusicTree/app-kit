import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { useAuthCallbackMock } = vi.hoisted(() => ({ useAuthCallbackMock: vi.fn() }));

vi.mock("@behindthemusictree/app-kit/auth", () => ({
  useAuthCallback: (options: unknown) => useAuthCallbackMock(options),
}));

import AuthCallbackHandler from "./AuthCallbackHandler";

const options = {
  authToBackendFromGoogleCode: vi.fn(),
  authToBackendFromSpotifyCode: vi.fn(),
  onReauthRequired: vi.fn(),
  onOAuthMisconfigured: vi.fn(),
  onSpotifyAuthError: vi.fn(),
};

describe("AuthCallbackHandler", () => {
  beforeEach(() => useAuthCallbackMock.mockReset());

  it("renders nothing when there is no callback to handle", () => {
    useAuthCallbackMock.mockReturnValue({ status: null });
    const { container } = render(<AuthCallbackHandler {...options} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("forwards its options to the hook", () => {
    useAuthCallbackMock.mockReturnValue({ status: null });
    render(<AuthCallbackHandler {...options} />);
    expect(useAuthCallbackMock).toHaveBeenCalledWith(options);
  });

  it("shows the connecting overlay while pending", () => {
    useAuthCallbackMock.mockReturnValue({ status: "pending" });
    render(<AuthCallbackHandler {...options} />);
    expect(screen.getByRole("heading", { name: /connecting/i })).toBeInTheDocument();
  });

  it("shows the error with a button that goes home", () => {
    const goHome = vi.fn();
    useAuthCallbackMock.mockReturnValue({ status: "error", message: "Boom", goHome });
    render(<AuthCallbackHandler {...options} />);
    expect(screen.getByText("Boom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /go to home/i }));
    expect(goHome).toHaveBeenCalledTimes(1);
  });

  it("delegates to renderStatus", () => {
    useAuthCallbackMock.mockReturnValue({ status: "pending" });
    render(<AuthCallbackHandler {...options} renderStatus={(state) => <p>custom {state.status}</p>} />);
    expect(screen.getByText("custom pending")).toBeInTheDocument();
  });
});
