"use client";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import AuthPopup from "./AuthPopup";

const spotifyOnlyDescription = (
  <>
    <b>My Library</b> requires Spotify to access your saved tracks and playlists.
  </>
);
const defaultDescription = (
  <>
    <b>My App</b> requires sign-in to access your library
  </>
);

describe("AuthPopup", () => {
  afterEach(() => {
    cleanup();
  });

  it("calls handleSpotifyOAuth with redirectAfterAuthPath when the Spotify button is clicked", () => {
    const handleSpotifyOAuth = vi.fn();
    render(
      <AuthPopup
        handleSpotifyOAuth={handleSpotifyOAuth}
        redirectAfterAuthPath="/library"
        spotifyOnlyDescription={spotifyOnlyDescription}
        defaultDescription={defaultDescription}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Sign in with Spotify/i }));

    expect(handleSpotifyOAuth).toHaveBeenCalledWith("/library");
  });

  it("shows the Google button and wires it to handleGoogleOAuth when provided and not spotifyOnly", () => {
    const handleGoogleOAuth = vi.fn();
    render(
      <AuthPopup
        handleSpotifyOAuth={vi.fn()}
        handleGoogleOAuth={handleGoogleOAuth}
        redirectAfterAuthPath="/library"
        spotifyOnlyDescription={spotifyOnlyDescription}
        defaultDescription={defaultDescription}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Sign in with Google/i }));

    expect(handleGoogleOAuth).toHaveBeenCalledWith("/library");
  });

  it("hides the Google button when spotifyOnly is true", () => {
    render(
      <AuthPopup
        handleSpotifyOAuth={vi.fn()}
        handleGoogleOAuth={vi.fn()}
        spotifyOnly
        spotifyOnlyDescription={spotifyOnlyDescription}
        defaultDescription={defaultDescription}
      />,
    );

    expect(screen.queryByRole("button", { name: /Sign in with Google/i })).not.toBeInTheDocument();
  });

  it("hides the Google button when handleGoogleOAuth is not provided", () => {
    render(
      <AuthPopup
        handleSpotifyOAuth={vi.fn()}
        spotifyOnlyDescription={spotifyOnlyDescription}
        defaultDescription={defaultDescription}
      />,
    );

    expect(screen.queryByRole("button", { name: /Sign in with Google/i })).not.toBeInTheDocument();
  });

  it("shows the spotifyOnly title and description when spotifyOnly is true", () => {
    render(
      <AuthPopup
        handleSpotifyOAuth={vi.fn()}
        spotifyOnly
        spotifyOnlyDescription={spotifyOnlyDescription}
        defaultDescription={defaultDescription}
      />,
    );

    expect(screen.getByText("Connect with Spotify")).toBeInTheDocument();
    expect(screen.getByText(/My Library/)).toBeInTheDocument();
  });

  it("shows the default title and description when spotifyOnly is not set", () => {
    render(
      <AuthPopup
        handleSpotifyOAuth={vi.fn()}
        spotifyOnlyDescription={spotifyOnlyDescription}
        defaultDescription={defaultDescription}
      />,
    );

    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText(/My App/)).toBeInTheDocument();
  });

  it("renders the optional message when provided", () => {
    render(
      <AuthPopup
        handleSpotifyOAuth={vi.fn()}
        message="Session expired"
        spotifyOnlyDescription={spotifyOnlyDescription}
        defaultDescription={defaultDescription}
      />,
    );

    expect(screen.getByText("Session expired")).toBeInTheDocument();
  });

  it("is not dismissable", () => {
    render(
      <AuthPopup
        handleSpotifyOAuth={vi.fn()}
        spotifyOnlyDescription={spotifyOnlyDescription}
        defaultDescription={defaultDescription}
      />,
    );

    expect(screen.queryByLabelText("Close popup")).not.toBeInTheDocument();
  });
});
