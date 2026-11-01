"use client";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import SpotifyAuthErrorPopup from "./SpotifyAuthErrorPopup";

describe("SpotifyAuthErrorPopup", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the message", () => {
    render(<SpotifyAuthErrorPopup message="Invalid credentials" onClose={vi.fn()} />);

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("renders details when provided", () => {
    render(<SpotifyAuthErrorPopup message="Invalid credentials" details="invalid_grant" onClose={vi.fn()} />);

    expect(screen.getByText("invalid_grant")).toBeInTheDocument();
  });

  it("renders no details when omitted", () => {
    render(<SpotifyAuthErrorPopup message="Invalid credentials" onClose={vi.fn()} />);

    expect(screen.queryByText("invalid_grant")).not.toBeInTheDocument();
  });

  it("renders a mailto link with the contact email when contactEmail is provided", () => {
    render(<SpotifyAuthErrorPopup message="Invalid credentials" onClose={vi.fn()} contactEmail="support@example.com" />);

    const links = screen.getAllByRole("link", { name: /support@example.com|Spotify full name/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link.getAttribute("href")).toMatch(/^mailto:support@example\.com\?/));
  });

  it("falls back to a generic message when no contact email is provided", () => {
    render(<SpotifyAuthErrorPopup message="Invalid credentials" onClose={vi.fn()} />);

    expect(screen.getByText(/To request access, contact the app owner\./)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("calls onClose when Try Again is clicked", () => {
    const onClose = vi.fn();
    render(<SpotifyAuthErrorPopup message="Invalid credentials" onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
