import { describe, expect, it } from "vitest";
import { BackendError, BackendSpotifyUserNotAllowlistedError, InvalidInputError } from "./app-error";
import { ErrorCode } from "./app-error-codes";
import { getSpotifyAllowlistMailtoHref } from "./app-error-messages";

describe("app-error classes", () => {
  it("includes the JSON payload in InvalidInputError.toString()", () => {
    const error = new InvalidInputError(ErrorCode.BACKEND_INVALID_INPUT, { field: "name" });

    expect(error.toString()).toContain('"field": "name"');
  });

  it("overrides the message when BackendError is given a backendMessage", () => {
    const error = new BackendError(ErrorCode.BACKEND_BAD_REQUEST, "custom backend message");

    expect(error.message).toBe("custom backend message");
  });

  it("sets the class name for BackendSpotifyUserNotAllowlistedError", () => {
    const error = new BackendSpotifyUserNotAllowlistedError(
      ErrorCode.BACKEND_SPOTIFY_USER_NOT_IN_ALLOWLIST,
      "you're not on the list",
    );

    expect(error.name).toBe("BackendSpotifyUserNotAllowlistedError");
    expect(error.detailsMessage).toBe("you're not on the list");
  });
});

describe("getSpotifyAllowlistMailtoHref", () => {
  it("returns null when no contact email is configured", () => {
    expect(getSpotifyAllowlistMailtoHref(null)).toBeNull();
    expect(getSpotifyAllowlistMailtoHref(undefined)).toBeNull();
  });

  it("builds a mailto href with the request subject and body", () => {
    const href = getSpotifyAllowlistMailtoHref("contact@example.com");

    expect(href).toContain("mailto:contact@example.com?");
    expect(href).toContain("subject=");
    expect(href).toContain("body=");
  });
});
