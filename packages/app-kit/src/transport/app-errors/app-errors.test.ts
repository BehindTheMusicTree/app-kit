import { describe, it, expect } from "vitest";

import {
  AppError,
  ClientError,
  InvalidInputError,
  ConnectivityError,
  BadRequestError,
  NetworkError,
  BackendError,
  BackendSpotifyUserNotAllowlistedError,
  AuthRequired,
  ServiceError,
} from "./app-error";
import { ErrorCode } from "./app-error-codes";
import { ErrorMessages, getSpotifyAllowlistMessage, getSpotifyAllowlistMailtoHref } from "./app-error-messages";
import { ConnectivityErrorType } from "./app-error-types";
import * as appErrorsIndex from "./index";

describe("AppError hierarchy", () => {
  it("sets message from ErrorMessages and name per class", () => {
    const appError = new AppError(ErrorCode.NETWORK_OFFLINE);
    expect(appError.message).toBe(ErrorMessages[ErrorCode.NETWORK_OFFLINE]);
    expect(appError.name).toBe("AppError");

    expect(new ClientError(ErrorCode.CLIENT_FORBIDDEN).name).toBe("ClientError");
    expect(new ConnectivityError(ErrorCode.NETWORK_ERROR).name).toBe("ConnectivityError");
    expect(new BadRequestError(ErrorCode.SERVICE_BAD_REQUEST).name).toBe("BadRequestError");
    expect(new NetworkError(ErrorCode.NETWORK_UNKNOWN).name).toBe("NetworkError");
    expect(new AuthRequired(ErrorCode.SESSION_REQUIRED).name).toBe("AuthRequired");
    expect(new ServiceError(ErrorCode.SERVICE_UNKNOWN).name).toBe("ServiceError");
  });

  it("InvalidInputError appends JSON to toString", () => {
    const error = new InvalidInputError(ErrorCode.BACKEND_INVALID_INPUT, { field: "name" });
    expect(error.name).toBe("InvalidInputError");
    expect(error.toString()).toContain(JSON.stringify({ field: "name" }, null, 2));
  });

  it("BackendError uses the default message when no backendMessage is given", () => {
    const error = new BackendError(ErrorCode.BACKEND_INTERNAL_ERROR);
    expect(error.name).toBe("BackendError");
    expect(error.message).toBe(ErrorMessages[ErrorCode.BACKEND_INTERNAL_ERROR]);
  });

  it("BackendError overrides the message when a backendMessage is given", () => {
    const error = new BackendError(ErrorCode.BACKEND_INTERNAL_ERROR, "custom backend message");
    expect(error.message).toBe("custom backend message");
  });

  it("BackendSpotifyUserNotAllowlistedError extends BackendError", () => {
    const error = new BackendSpotifyUserNotAllowlistedError(
      ErrorCode.BACKEND_SPOTIFY_USER_NOT_IN_ALLOWLIST,
      "details",
    );
    expect(error.name).toBe("BackendSpotifyUserNotAllowlistedError");
    expect(error.detailsMessage).toBe("details");
    expect(error).toBeInstanceOf(BackendError);
  });
});

describe("getSpotifyAllowlistMessage / getSpotifyAllowlistMailtoHref", () => {
  it("returns a fixed allowlist message", () => {
    expect(getSpotifyAllowlistMessage()).toBe("Your Spotify account is not yet authorized for this app.");
  });

  it("returns null when no contact email is given", () => {
    expect(getSpotifyAllowlistMailtoHref(null)).toBeNull();
    expect(getSpotifyAllowlistMailtoHref(undefined)).toBeNull();
  });

  it("builds a mailto href with subject/body when a contact email is given", () => {
    const href = getSpotifyAllowlistMailtoHref("support@example.com");
    expect(href).toContain("mailto:support@example.com?");
    expect(href).toContain("subject=");
    expect(href).toContain("body=");
  });
});

describe("ConnectivityErrorType", () => {
  it("exposes the expected members", () => {
    expect(ConnectivityErrorType.NETWORK).toBe("NETWORK");
    expect(ConnectivityErrorType.INTERNAL).toBe("INTERNAL");
    expect(ConnectivityErrorType.AUTH_REQUIRED).toBe("AUTH_REQUIRED");
    expect(ConnectivityErrorType.BAD_REQUEST).toBe("BAD_REQUEST");
  });
});

describe("app-errors barrel", () => {
  it("re-exports AppError and ErrorCode", () => {
    expect(appErrorsIndex.AppError).toBe(AppError);
    expect(appErrorsIndex.ErrorCode).toBe(ErrorCode);
  });
});
