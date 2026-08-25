import { describe, it, expect } from "vitest";
import {
  createAppErrorFromErrorCode,
  createAppErrorFromResult,
  createNetworkOrBackendError,
} from "./app-error-factory";
import { ErrorCode } from "./app-error-codes";
import { AppError, NetworkError, BackendError, AuthRequired, ClientError, ServiceError, InvalidInputError } from "./app-error";

function makeResponse(status: number, url: string, json?: unknown): Response {
  return {
    status,
    url,
    json: () => {
      if (json === undefined) {
        return Promise.reject(new Error("no json body"));
      }
      return Promise.resolve(json);
    },
  } as unknown as Response;
}

describe("createAppErrorFromErrorCode", () => {
  it.each([
    [ErrorCode.BACKEND_UNAUTHORIZED, AuthRequired],
    [ErrorCode.SESSION_EXPIRED, AuthRequired],
    [ErrorCode.SESSION_REQUIRED, AuthRequired],
  ])("returns AuthRequired for %s", (code, cls) => {
    expect(createAppErrorFromErrorCode(code)).toBeInstanceOf(cls);
  });

  it("returns NetworkError for NET-prefixed codes", () => {
    expect(createAppErrorFromErrorCode(ErrorCode.NETWORK_OFFLINE)).toBeInstanceOf(NetworkError);
  });

  it("returns BackendError for BAC-prefixed codes", () => {
    expect(createAppErrorFromErrorCode(ErrorCode.BACKEND_INTERNAL_ERROR)).toBeInstanceOf(BackendError);
  });

  it("returns ClientError for CLI-prefixed codes", () => {
    expect(createAppErrorFromErrorCode(ErrorCode.CLIENT_UNKNOWN)).toBeInstanceOf(ClientError);
  });

  it("returns ServiceError for SER-prefixed codes", () => {
    expect(createAppErrorFromErrorCode(ErrorCode.SERVICE_INTERNAL_ERROR)).toBeInstanceOf(ServiceError);
  });

  it("returns InvalidInputError for INP-prefixed codes, with json body", () => {
    const err = createAppErrorFromErrorCode(ErrorCode.BACKEND_INVALID_INPUT, { field: "bad" }) as InvalidInputError;
    expect(err).toBeInstanceOf(InvalidInputError);
    expect(err.json).toEqual({ field: "bad" });
  });

  it("returns InvalidInputError with empty json when omitted", () => {
    const err = createAppErrorFromErrorCode(ErrorCode.BACKEND_INVALID_INPUT) as InvalidInputError;
    expect(err.json).toEqual({});
  });

  it("returns plain AppError for unrecognized code prefixes", () => {
    const err = createAppErrorFromErrorCode("XXX0000" as ErrorCode);
    expect(err).toBeInstanceOf(AppError);
    expect(err).not.toBeInstanceOf(NetworkError);
  });
});

describe("createAppErrorFromResult", () => {
  const backendBaseUrl = "https://api.example.com";

  describe("status 400", () => {
    it("backend: parses json and returns BACKEND_INVALID_INPUT", async () => {
      const res = makeResponse(400, `${backendBaseUrl}/foo`, { code: "bad" });
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_INVALID_INPUT);
    });

    it("backend: falls back when json parse fails", async () => {
      const res = makeResponse(400, `${backendBaseUrl}/foo`);
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_INVALID_INPUT);
    });

    it("non-backend: returns SERVICE_BAD_REQUEST", async () => {
      const res = makeResponse(400, "https://other.example.com/foo");
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.SERVICE_BAD_REQUEST);
    });
  });

  describe("status 401", () => {
    it.each([
      ["google_oauth_code_invalid_or_expired", ErrorCode.BACKEND_GOOGLE_OAUTH_CODE_INVALID_OR_EXPIRED],
      ["spotify_oauth_code_invalid_or_expired", ErrorCode.BACKEND_SPOTIFY_OAUTH_CODE_INVALID_OR_EXPIRED],
      ["spotify_authentication_error", ErrorCode.BACKEND_SPOTIFY_AUTHENTICATION_ERROR],
      ["google_authentication_error", ErrorCode.BACKEND_GOOGLE_AUTHENTICATION_ERROR],
      ["google_oauth_redirect_uri_mismatch", ErrorCode.BACKEND_GOOGLE_OAUTH_MISCONFIGURED],
      ["google_oauth_invalid_client", ErrorCode.BACKEND_GOOGLE_OAUTH_MISCONFIGURED],
      ["google_oauth_unauthorized_client", ErrorCode.BACKEND_GOOGLE_OAUTH_UNAUTHORIZED_CLIENT],
      ["authentication_required", ErrorCode.BACKEND_UNAUTHORIZED],
    ])("backend: details.code=%s -> %s", async (detailsCode, expectedCode) => {
      const res = makeResponse(401, `${backendBaseUrl}/foo`, { details: { code: detailsCode, message: "msg" } });
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(expectedCode);
    });

    it("backend: details.code=spotify_user_not_in_allowlist uses allowlist message", async () => {
      const res = makeResponse(401, `${backendBaseUrl}/foo`, {
        details: { code: "spotify_user_not_in_allowlist" },
      });
      const err = (await createAppErrorFromResult(res, backendBaseUrl)) as BackendError;
      expect(err.code).toBe(ErrorCode.BACKEND_SPOTIFY_USER_NOT_IN_ALLOWLIST);
      expect(err.backendMessage).toBe("Your Spotify account is not yet authorized for this app.");
    });

    it("backend: apiCode=1006 -> BACKEND_UNAUTHORIZED", async () => {
      const res = makeResponse(401, `${backendBaseUrl}/foo`, { code: 1006 });
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_UNAUTHORIZED);
    });

    it("backend: apiCode=1001 -> BACKEND_UNAUTHORIZED", async () => {
      const res = makeResponse(401, `${backendBaseUrl}/foo`, { code: 1001 });
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_UNAUTHORIZED);
    });

    it("backend: unrecognized body falls back to BACKEND_UNAUTHORIZED", async () => {
      const res = makeResponse(401, `${backendBaseUrl}/foo`, {});
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_UNAUTHORIZED);
    });

    it("backend: json parse failure falls back to BACKEND_UNAUTHORIZED", async () => {
      const res = makeResponse(401, `${backendBaseUrl}/foo`);
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_UNAUTHORIZED);
    });

    it("non-backend: returns SERVICE_UNAUTHORIZED", async () => {
      const res = makeResponse(401, "https://other.example.com/foo");
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.SERVICE_UNAUTHORIZED);
    });
  });

  describe("status 403", () => {
    it("backend: apiCode=1005 -> BACKEND_SPOTIFY_AUTHORIZATION_REQUIRED", async () => {
      const res = makeResponse(403, `${backendBaseUrl}/foo`, { code: 1005 });
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_SPOTIFY_AUTHORIZATION_REQUIRED);
    });

    it("backend: details.code=spotify_authorization_required -> BACKEND_SPOTIFY_AUTHORIZATION_REQUIRED", async () => {
      const res = makeResponse(403, `${backendBaseUrl}/foo`, { details: { code: "spotify_authorization_required" } });
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_SPOTIFY_AUTHORIZATION_REQUIRED);
    });

    it("backend: unrecognized body falls back to BACKEND_FORBIDDEN", async () => {
      const res = makeResponse(403, `${backendBaseUrl}/foo`, {});
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_FORBIDDEN);
    });

    it("backend: json parse failure falls back to BACKEND_FORBIDDEN", async () => {
      const res = makeResponse(403, `${backendBaseUrl}/foo`);
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_FORBIDDEN);
    });

    it("non-backend: returns SERVICE_FORBIDDEN", async () => {
      const res = makeResponse(403, "https://other.example.com/foo");
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.SERVICE_FORBIDDEN);
    });
  });

  describe("status 404", () => {
    it("backend: returns BACKEND_NOT_FOUND", async () => {
      const res = makeResponse(404, `${backendBaseUrl}/foo`);
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_NOT_FOUND);
    });

    it("non-backend: returns SERVICE_NOT_FOUND", async () => {
      const res = makeResponse(404, "https://other.example.com/foo");
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.SERVICE_NOT_FOUND);
    });
  });

  describe("status 405", () => {
    it("backend: returns BACKEND_METHOD_NOT_ALLOWED", async () => {
      const res = makeResponse(405, `${backendBaseUrl}/foo`);
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_METHOD_NOT_ALLOWED);
    });

    it("non-backend: returns SERVICE_METHOD_NOT_ALLOWED", async () => {
      const res = makeResponse(405, "https://other.example.com/foo");
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.SERVICE_METHOD_NOT_ALLOWED);
    });
  });

  describe("status 408", () => {
    it("backend: returns BACKEND_REQUEST_TIMEOUT", async () => {
      const res = makeResponse(408, `${backendBaseUrl}/foo`);
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_REQUEST_TIMEOUT);
    });

    it("non-backend: returns SERVICE_REQUEST_TIMEOUT", async () => {
      const res = makeResponse(408, "https://other.example.com/foo");
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.SERVICE_REQUEST_TIMEOUT);
    });
  });

  describe("status 500", () => {
    it("backend: details.code=spotify_invalid_client -> BACKEND_SPOTIFY_OAUTH_INVALID_CLIENT", async () => {
      const res = makeResponse(500, `${backendBaseUrl}/foo`, { details: { code: "spotify_invalid_client", message: "m" } });
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_SPOTIFY_OAUTH_INVALID_CLIENT);
    });

    it("backend: unrecognized body falls back to BACKEND_INTERNAL_ERROR", async () => {
      const res = makeResponse(500, `${backendBaseUrl}/foo`, {});
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_INTERNAL_ERROR);
    });

    it("backend: json parse failure falls back to BACKEND_INTERNAL_ERROR", async () => {
      const res = makeResponse(500, `${backendBaseUrl}/foo`);
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.BACKEND_INTERNAL_ERROR);
    });

    it("non-backend: returns SERVICE_INTERNAL_ERROR", async () => {
      const res = makeResponse(500, "https://other.example.com/foo");
      const err = await createAppErrorFromResult(res, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.SERVICE_INTERNAL_ERROR);
    });
  });

  it("returns CLIENT_UNKNOWN for an unhandled status code", async () => {
    const res = makeResponse(418, `${backendBaseUrl}/foo`);
    const err = await createAppErrorFromResult(res, backendBaseUrl);
    expect(err.code).toBe(ErrorCode.CLIENT_UNKNOWN);
  });

  it("treats result as non-backend when backendBaseUrl is omitted", async () => {
    const res = makeResponse(404, "https://api.example.com/foo");
    const err = await createAppErrorFromResult(res);
    expect(err.code).toBe(ErrorCode.SERVICE_NOT_FOUND);
  });
});

describe("createNetworkOrBackendError", () => {
  const backendBaseUrl = "https://api.example.com";
  const backendUrl = `${backendBaseUrl}/foo`;
  const otherUrl = "https://other.example.com/foo";

  const withOnlineStatus = (online: boolean, fn: () => void) => {
    const original = Object.getOwnPropertyDescriptor(navigator, "onLine");
    Object.defineProperty(navigator, "onLine", { value: online, configurable: true });
    try {
      fn();
    } finally {
      if (original) Object.defineProperty(navigator, "onLine", original);
    }
  };

  it("returns NETWORK_OFFLINE when navigator is offline", () => {
    withOnlineStatus(false, () => {
      const err = createNetworkOrBackendError(new Error("whatever"), backendUrl, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.NETWORK_OFFLINE);
    });
  });

  describe("non-Error values", () => {
    it("string + backend -> BACKEND_INTERNAL_ERROR", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError("oops", backendUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.BACKEND_INTERNAL_ERROR);
      });
    });

    it("string + non-backend -> NETWORK_UNKNOWN", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError("oops", otherUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.NETWORK_UNKNOWN);
      });
    });

    it("non-string, non-Error -> NETWORK_UNKNOWN", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError({ some: "object" }, backendUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.NETWORK_UNKNOWN);
      });
    });
  });

  describe("TypeError messages", () => {
    it("'Failed to fetch' + backend -> BACKEND_UNAVAILABLE", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError(new TypeError("Failed to fetch"), backendUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.BACKEND_UNAVAILABLE);
      });
    });

    it("'Failed to fetch' + non-backend -> NETWORK_FAILED_TO_FETCH", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError(new TypeError("Failed to fetch"), otherUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.NETWORK_FAILED_TO_FETCH);
      });
    });

    it("'Network request failed' + backend -> BACKEND_UNAVAILABLE", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError(new TypeError("Network request failed"), backendUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.BACKEND_UNAVAILABLE);
      });
    });

    it("'Network request failed' + non-backend -> NETWORK_CONNECTION_REFUSED", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError(new TypeError("Network request failed"), otherUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.NETWORK_CONNECTION_REFUSED);
      });
    });

    it("message including 'timeout' + backend -> BACKEND_REQUEST_TIMEOUT", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError(new TypeError("connection timeout"), backendUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.BACKEND_REQUEST_TIMEOUT);
      });
    });

    it("message including 'timeout' + non-backend -> NETWORK_TIMEOUT", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError(new TypeError("connection timeout"), otherUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.NETWORK_TIMEOUT);
      });
    });

    it("unrecognized TypeError message falls through to generic handling", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError(new TypeError("something else"), otherUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.NETWORK_UNKNOWN);
      });
    });
  });

  it("AbortError name -> NETWORK_ABORT_ERROR", () => {
    withOnlineStatus(true, () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      const err = createNetworkOrBackendError(error, backendUrl, backendBaseUrl);
      expect(err.code).toBe(ErrorCode.NETWORK_ABORT_ERROR);
    });
  });

  describe("generic Error message matching", () => {
    it("'Failed to fetch' + backend -> BACKEND_UNAVAILABLE", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError(new Error("Failed to fetch"), backendUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.BACKEND_UNAVAILABLE);
      });
    });

    it("'Failed to fetch' + non-backend -> NETWORK_FAILED_TO_FETCH", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError(new Error("Failed to fetch"), otherUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.NETWORK_FAILED_TO_FETCH);
      });
    });

    it("'not found' + backend -> BACKEND_NOT_FOUND", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError(new Error("resource not found"), backendUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.BACKEND_NOT_FOUND);
      });
    });

    it("'not found' + non-backend -> NETWORK_NOT_FOUND", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError(new Error("resource not found"), otherUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.NETWORK_NOT_FOUND);
      });
    });

    it("unrecognized message + backend -> BACKEND_INTERNAL_ERROR", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError(new Error("mystery"), backendUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.BACKEND_INTERNAL_ERROR);
      });
    });

    it("unrecognized message + non-backend -> NETWORK_UNKNOWN", () => {
      withOnlineStatus(true, () => {
        const err = createNetworkOrBackendError(new Error("mystery"), otherUrl, backendBaseUrl);
        expect(err.code).toBe(ErrorCode.NETWORK_UNKNOWN);
      });
    });
  });

  it("treats url as non-backend when backendBaseUrl is omitted", () => {
    withOnlineStatus(true, () => {
      const err = createNetworkOrBackendError(new Error("mystery"), backendUrl);
      expect(err.code).toBe(ErrorCode.NETWORK_UNKNOWN);
    });
  });
});
