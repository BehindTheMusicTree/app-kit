import { describe, expect, it } from "vitest";
import {
  AuthRequired,
  BackendError,
  BackendSpotifyUserNotAllowlistedError,
  InvalidInputError,
  NetworkError,
  ServiceError,
  isRetryableError,
} from "./app-error";
import { AUTH_DETAIL_ERROR_CODES, ErrorCode } from "./app-error-codes";
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

describe("isRetryableError", () => {
  it("never retries final errors", () => {
    expect(isRetryableError(new AuthRequired(ErrorCode.BACKEND_UNAUTHORIZED))).toBe(false);
    expect(isRetryableError(new InvalidInputError(ErrorCode.BACKEND_INVALID_INPUT, {}))).toBe(false);
    expect(isRetryableError(new BackendError(ErrorCode.BACKEND_NOT_FOUND))).toBe(false);
    for (const code of AUTH_DETAIL_ERROR_CODES) {
      expect(isRetryableError(new BackendError(code))).toBe(false);
    }
  });

  it("retries transient failures", () => {
    expect(isRetryableError(new NetworkError(ErrorCode.NETWORK_ERROR))).toBe(true);
    expect(isRetryableError(new ServiceError(ErrorCode.SERVICE_INTERNAL_ERROR))).toBe(true);
    expect(isRetryableError(new BackendError(ErrorCode.BACKEND_BAD_REQUEST))).toBe(true);
    expect(isRetryableError(new Error("parse"))).toBe(true);
  });
});
