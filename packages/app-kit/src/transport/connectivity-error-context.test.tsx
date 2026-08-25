"use client";

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ConnectivityErrorProvider, useConnectivityError } from "./connectivity-error-context";
import { NetworkError } from "./app-errors/app-error";
import { ErrorCode } from "./app-errors/app-error-codes";

function Consumer() {
  const { connectivityError, setConnectivityError, clearConnectivityError } = useConnectivityError();
  return (
    <div>
      <span>{connectivityError ? connectivityError.message : "none"}</span>
      <button onClick={() => setConnectivityError(new NetworkError(ErrorCode.NETWORK_ERROR))}>set</button>
      <button onClick={clearConnectivityError}>clear</button>
    </div>
  );
}

function ConsumerOutsideProvider() {
  useConnectivityError();
  return null;
}

describe("ConnectivityErrorProvider / useConnectivityError", () => {
  afterEach(() => {
    cleanup();
  });

  it("throws when used outside a ConnectivityErrorProvider", () => {
    expect(() => render(<ConsumerOutsideProvider />)).toThrow(
      "useConnectivityError must be used within a ConnectivityErrorProvider",
    );
  });

  it("starts with no connectivity error", () => {
    render(
      <ConnectivityErrorProvider>
        <Consumer />
      </ConnectivityErrorProvider>,
    );

    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("sets and clears the connectivity error", () => {
    render(
      <ConnectivityErrorProvider>
        <Consumer />
      </ConnectivityErrorProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "set" }));
    expect(screen.queryByText("none")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "clear" }));
    expect(screen.getByText("none")).toBeInTheDocument();
  });
});
