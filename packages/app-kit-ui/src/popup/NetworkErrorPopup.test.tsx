"use client";

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ErrorCode } from "@behindthemusictree/app-kit/transport";
import NetworkErrorPopup from "./NetworkErrorPopup";

describe("NetworkErrorPopup", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the offline message when the browser is offline", () => {
    render(<NetworkErrorPopup errorCode={ErrorCode.NETWORK_OFFLINE} />);

    expect(screen.getByText(/not connected to the internet/i)).toBeInTheDocument();
  });

  it("renders the server-unreachable message for other network failures", () => {
    render(<NetworkErrorPopup errorCode={ErrorCode.NETWORK_FAILED_TO_FETCH} />);

    expect(screen.getByText(/couldn't reach the server/i)).toBeInTheDocument();
    expect(screen.queryByText(/not connected to the internet/i)).not.toBeInTheDocument();
  });

  it("is not dismissable", () => {
    render(<NetworkErrorPopup errorCode={ErrorCode.NETWORK_OFFLINE} />);

    expect(screen.queryByLabelText("Close popup")).not.toBeInTheDocument();
  });
});
