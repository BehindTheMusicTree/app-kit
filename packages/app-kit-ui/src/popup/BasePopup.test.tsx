"use client";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BasePopup } from "./BasePopup";

describe("BasePopup", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not throw when the title's close button is clicked and onClose is not provided", () => {
    render(<BasePopup title="Title">content</BasePopup>);

    expect(() => fireEvent.click(screen.getByLabelText("Close popup"))).not.toThrow();
  });

  it("renders no buttons when showOkButton and showCancelButton are both false", () => {
    render(<BasePopup title="Title">content</BasePopup>);

    expect(screen.queryByRole("button", { name: "OK" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("calls onCancel when the Cancel button is clicked and onCancel is provided", () => {
    const onCancel = vi.fn();
    const onClose = vi.fn();
    render(
      <BasePopup title="Title" showCancelButton onCancel={onCancel} onClose={onClose}>
        content
      </BasePopup>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("falls back to onClose when the Cancel button is clicked and onCancel is not provided", () => {
    const onClose = vi.fn();
    render(
      <BasePopup title="Title" showCancelButton onClose={onClose}>
        content
      </BasePopup>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the Cancel button is clicked and neither onCancel nor onClose is provided", () => {
    render(
      <BasePopup title="Title" showCancelButton>
        content
      </BasePopup>,
    );

    expect(() => fireEvent.click(screen.getByRole("button", { name: "Cancel" }))).not.toThrow();
  });

  it("calls onOk when the OK button is clicked and onOk is provided", () => {
    const onOk = vi.fn();
    const onClose = vi.fn();
    render(
      <BasePopup title="Title" showOkButton onOk={onOk} onClose={onClose}>
        content
      </BasePopup>,
    );

    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onOk).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("falls back to onClose when the OK button is clicked and onOk is not provided", () => {
    const onClose = vi.fn();
    render(
      <BasePopup title="Title" showOkButton onClose={onClose}>
        content
      </BasePopup>,
    );

    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the OK button is clicked and neither onOk nor onClose is provided", () => {
    render(
      <BasePopup title="Title" showOkButton>
        content
      </BasePopup>,
    );

    expect(() => fireEvent.click(screen.getByRole("button", { name: "OK" }))).not.toThrow();
  });

  it("disables the OK button when okButtonDisabled is true", () => {
    render(
      <BasePopup title="Title" showOkButton okButtonDisabled>
        content
      </BasePopup>,
    );

    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
  });

  it("uses custom button text and alignment when provided", () => {
    render(
      <BasePopup
        title="Title"
        showOkButton
        showCancelButton
        okButtonText="Confirm"
        cancelButtonText="Dismiss"
        buttonAlignment="left"
      >
        content
      </BasePopup>,
    );

    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });
});
