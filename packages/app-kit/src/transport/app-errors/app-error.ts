import { AUTH_DETAIL_ERROR_CODES, ErrorCode } from "./app-error-codes";
import { ErrorMessages } from "./app-error-messages";

export class AppError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(ErrorMessages[code]);
    this.name = "AppError";
  }
}

export class ClientError extends AppError {
  constructor(code: ErrorCode) {
    super(code);
    this.name = "ClientError";
  }
}

export class InvalidInputError extends ClientError {
  constructor(code: ErrorCode, public readonly json: object) {
    super(code);
    this.name = "InvalidInputError";
  }

  toString(): string {
    return `${super.toString()}\nJSON: ${JSON.stringify(this.json, null, 2)}`;
  }
}

export class ConnectivityError extends AppError {
  constructor(code: ErrorCode) {
    super(code);
    this.name = "ConnectivityError";
  }
}

export class BadRequestError extends ConnectivityError {
  constructor(code: ErrorCode) {
    super(code);
    this.name = "BadRequestError";
  }
}

export class NetworkError extends ConnectivityError {
  constructor(code: ErrorCode) {
    super(code);
    this.name = "NetworkError";
  }
}

export class BackendError extends ConnectivityError {
  constructor(
    code: ErrorCode,
    public readonly backendMessage?: string,
  ) {
    super(code);
    this.name = "BackendError";
    if (backendMessage) {
      this.message = backendMessage;
    }
  }
}

export class BackendSpotifyUserNotAllowlistedError extends BackendError {
  constructor(
    code: ErrorCode,
    public readonly detailsMessage: string,
  ) {
    super(code);
    this.name = "BackendSpotifyUserNotAllowlistedError";
  }
}

export class AuthRequired extends ConnectivityError {
  constructor(code: ErrorCode) {
    super(code);
    this.name = "AuthRequired";
  }
}

export class ServiceError extends ConnectivityError {
  constructor(code: ErrorCode) {
    super(code);
    this.name = "ServiceError";
  }
}

/** The backend answered 404 for the requested resource. */
export const isNotFoundError = (error: unknown): error is BackendError =>
  error instanceof BackendError && error.code === ErrorCode.BACKEND_NOT_FOUND;

/**
 * Whether repeating the same request can succeed. Auth, not-found, invalid-input and client errors
 * are final; network, service and other backend failures may be transient.
 */
export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof AuthRequired || error instanceof ClientError || error instanceof BadRequestError) return false;
  if (isNotFoundError(error)) return false;
  if (error instanceof BackendError && AUTH_DETAIL_ERROR_CODES.includes(error.code)) return false;
  return true;
};

/**
 * Union type of all error classes.
 * Required because TypeScript's type system doesn't automatically recognize
 * class inheritance for type checking in instanceof expressions.
 */
export type AppErrorType =
  | AppError
  | ClientError
  | ConnectivityError
  | BadRequestError
  | NetworkError
  | BackendError
  | BackendSpotifyUserNotAllowlistedError
  | AuthRequired
  | ServiceError;
