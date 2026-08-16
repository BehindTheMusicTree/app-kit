"use client";

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ErrorCode } from "../transport/app-errors/app-error-codes";
import InternalErrorPopup from "./InternalErrorPopup";

describe("InternalErrorPopup", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the error code", () => {
    render(<InternalErrorPopup errorCode={ErrorCode.CLIENT_INTERNAL_ERROR} />);

    expect(screen.getByText(`Error Code: ${ErrorCode.CLIENT_INTERNAL_ERROR}`)).toBeInTheDocument();
  });

  it("renders the given contact email as a mailto link", () => {
    render(<InternalErrorPopup errorCode={ErrorCode.CLIENT_INTERNAL_ERROR} contactEmail="support@example.com" />);

    const link = screen.getByRole("link", { name: "support@example.com" });
    expect(link.getAttribute("href")).toBe("mailto:support@example.com");
  });

  it("is not dismissable", () => {
    render(<InternalErrorPopup errorCode={ErrorCode.CLIENT_INTERNAL_ERROR} />);

    expect(screen.queryByLabelText("Close popup")).not.toBeInTheDocument();
  });
});
