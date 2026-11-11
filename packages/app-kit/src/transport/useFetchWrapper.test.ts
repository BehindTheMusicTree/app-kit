import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { AuthRequired, BackendError, ConnectivityError } from "./app-errors/app-error";
import { ErrorCode } from "./app-errors/app-error-codes";

const {
  setConnectivityErrorMock,
  clearSessionMock,
  rawFetchMock,
  createAppErrorFromErrorCodeMock,
} = vi.hoisted(() => ({
  setConnectivityErrorMock: vi.fn(),
  clearSessionMock: vi.fn(),
  rawFetchMock: vi.fn(),
  createAppErrorFromErrorCodeMock: vi.fn(),
}));

const playbackState = vi.hoisted(() => ({
  key: null as string | null,
  country: null as string | null,
  snapshot: () => ({ key: playbackState.key, country: playbackState.country }),
  refresh: vi.fn(async (_force?: boolean) => null as string | null),
  isCurrent: vi.fn(() => true),
}));
vi.mock("./PlaybackContext", () => ({ usePlaybackContext: () => playbackState }));

vi.mock("./connectivity-error-context", () => ({
  useConnectivityError: () => ({ setConnectivityError: setConnectivityErrorMock }),
}));

vi.mock("../auth/SessionContext", () => ({
  useSession: () => useSessionState,
}));

vi.mock("./fetch-wrapper", () => ({
  fetchWrapper: (...args: unknown[]) => rawFetchMock(...args),
}));

vi.mock("./app-errors/app-error-factory", () => ({
  createAppErrorFromErrorCode: (...args: unknown[]) => createAppErrorFromErrorCodeMock(...args),
}));

import { useFetchWrapper } from "./useFetchWrapper";

let useSessionState: { clearSession: () => void; session: { accessToken?: string } | null; sessionRestored: boolean };

describe("useFetchWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    playbackState.key = null;
    playbackState.country = null;
    playbackState.isCurrent.mockReturnValue(true);
    useSessionState = { clearSession: clearSessionMock, session: { accessToken: "token" }, sessionRestored: true };
  });

  it("never touches the playback context, whatever the endpoint", async () => {
    playbackState.key = "FR:1";
    playbackState.isCurrent.mockReturnValue(false);
    rawFetchMock.mockResolvedValueOnce({ results: [] });
    const { result } = renderHook(() => useFetchWrapper(() => "https://api.example.com"));
    await expect(result.current.fetch("genre-playlists/tree/", true, false)).resolves.toEqual({ results: [] });
    expect(playbackState.refresh).not.toHaveBeenCalled();
  });

  describe("playback drift guard", () => {
    const run = async (options: RequestInit, headers: Record<string, string>) => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      rawFetchMock.mockImplementationOnce(async (...args: unknown[]) => {
        await (args[9] as ((response: Response) => Promise<void>) | undefined)?.(new Response(null, { headers }));
        return {};
      });
      const { result } = renderHook(() => useFetchWrapper(() => "https://api.example.com"));
      await result.current.fetch("library/songs/", true, false, options);
      return spy;
    };

    it("logs an error for a GET stamped with X-Playback-Country", async () => {
      const spy = await run({}, { "X-Playback-Country": "FR" });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("library/songs/"));
      spy.mockRestore();
    });

    it("stays silent for a stamped PATCH", async () => {
      const spy = await run({ method: "PATCH" }, { "X-Playback-Country": "FR" });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("stays silent for an unstamped GET", async () => {
      const spy = await run({}, {});
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  it("builds the backend url from a relative endpoint and calls rawFetch", () => {
    const { result } = renderHook(() => useFetchWrapper(() => "https://api.example.com/"));

    result.current.fetch("me/profile/", true, true, { method: "GET" }, { page: 1 });

    const [url, requiresAuth, options, accessToken, queryParams] = rawFetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.com/me/profile/");
    expect(requiresAuth).toBe(true);
    expect(options).toEqual({ method: "GET" });
    expect(accessToken).toBe("token");
    expect(queryParams).toEqual({ page: 1 });
  });

  it("uses the bare base url when the endpoint path is empty", () => {
    const { result } = renderHook(() => useFetchWrapper(() => "https://api.example.com"));

    result.current.fetch("", true);

    expect(rawFetchMock.mock.calls[0][0]).toBe("https://api.example.com");
  });

  it("uses the given url as-is when fromBackend is false", () => {
    const { result } = renderHook(() => useFetchWrapper(() => "https://api.example.com"));

    result.current.fetch("https://external.example.com/thing", false);

    expect(rawFetchMock.mock.calls[0][0]).toBe("https://external.example.com/thing");
  });

  it("throws when fromBackend is true and the endpoint starts with a slash", () => {
    const { result } = renderHook(() => useFetchWrapper(() => "https://api.example.com"));

    expect(() => result.current.fetch("/me/profile/", true)).toThrow(
      'Endpoint path must be relative (no leading slash). Got: "/me/profile/".',
    );
  });

  it("passes undefined for accessToken when there is no session", () => {
    useSessionState = { clearSession: clearSessionMock, session: null, sessionRestored: true };
    const { result } = renderHook(() => useFetchWrapper(() => "https://api.example.com"));

    result.current.fetch("me/profile/", true);

    expect(rawFetchMock.mock.calls[0][3]).toBeUndefined();
  });

  it("passes undefined for handleError when skipGlobalError is true", () => {
    const { result } = renderHook(() => useFetchWrapper(() => "https://api.example.com"));

    result.current.fetch("me/profile/", true, true, {}, undefined, false, true);

    expect(rawFetchMock.mock.calls[0][6]).toBeUndefined();
  });

  it("passes a handleError function when skipGlobalError is false", () => {
    const { result } = renderHook(() => useFetchWrapper(() => "https://api.example.com"));

    result.current.fetch("me/profile/", true);

    expect(rawFetchMock.mock.calls[0][6]).toBeInstanceOf(Function);
  });

  it("handleMissingRequiredSession does nothing when the session is not restored", () => {
    useSessionState = { clearSession: clearSessionMock, session: null, sessionRestored: false };
    const { result } = renderHook(() => useFetchWrapper(() => "https://api.example.com"));

    result.current.fetch("me/profile/", true);
    rawFetchMock.mock.calls[0][5]();

    expect(setConnectivityErrorMock).not.toHaveBeenCalled();
  });

  it("handleMissingRequiredSession sets a SESSION_REQUIRED connectivity error when restored", () => {
    const appError = new BackendError(ErrorCode.SESSION_REQUIRED);
    createAppErrorFromErrorCodeMock.mockReturnValue(appError);
    const { result } = renderHook(() => useFetchWrapper(() => "https://api.example.com"));

    result.current.fetch("me/profile/", true);
    rawFetchMock.mock.calls[0][5]();

    expect(createAppErrorFromErrorCodeMock).toHaveBeenCalledWith(ErrorCode.SESSION_REQUIRED);
    expect(setConnectivityErrorMock).toHaveBeenCalledWith(appError);
  });

  describe("handleError", () => {
    const getHandleError = () => {
      const { result } = renderHook(() => useFetchWrapper(() => "https://api.example.com"));
      result.current.fetch("me/profile/", true);
      return rawFetchMock.mock.calls[0][6] as (error: Error) => void;
    };

    it("rethrows an error that is not a ConnectivityError", () => {
      const handleError = getHandleError();
      const error = new Error("boom");

      expect(() => handleError(error)).toThrow(error);
      expect(setConnectivityErrorMock).not.toHaveBeenCalled();
    });

    it("sets the connectivity error for a plain ConnectivityError", () => {
      const handleError = getHandleError();
      const error = new ConnectivityError(ErrorCode.BACKEND_AUTH_ERROR);

      expect(() => handleError(error)).not.toThrow();
      expect(setConnectivityErrorMock).toHaveBeenCalledWith(error);
      expect(clearSessionMock).not.toHaveBeenCalled();
    });

    it("clears the session and sets the connectivity error for AuthRequired", () => {
      const handleError = getHandleError();
      const error = new AuthRequired(ErrorCode.SESSION_REQUIRED);

      expect(() => handleError(error)).not.toThrow();
      expect(clearSessionMock).toHaveBeenCalled();
      expect(setConnectivityErrorMock).toHaveBeenCalledWith(error);
    });

    it("rethrows a BackendError whose code is one of the auth detail errors, without setting connectivity error", () => {
      const handleError = getHandleError();
      const error = new BackendError(ErrorCode.BACKEND_SPOTIFY_USER_NOT_IN_ALLOWLIST);

      expect(() => handleError(error)).toThrow(error);
      expect(setConnectivityErrorMock).not.toHaveBeenCalled();
    });

    it("sets the connectivity error then rethrows for BACKEND_SPOTIFY_AUTHORIZATION_REQUIRED", () => {
      const handleError = getHandleError();
      const error = new BackendError(ErrorCode.BACKEND_SPOTIFY_AUTHORIZATION_REQUIRED);

      expect(() => handleError(error)).toThrow(error);
      expect(setConnectivityErrorMock).toHaveBeenCalledWith(error);
    });

    it("rethrows a 404 without raising the global connectivity error", () => {
      const handleError = getHandleError();
      const error = new BackendError(ErrorCode.BACKEND_NOT_FOUND);

      expect(() => handleError(error)).toThrow(error);
      expect(setConnectivityErrorMock).not.toHaveBeenCalled();
    });

    it("still raises the global connectivity error for a 404 on a write", () => {
      const { result } = renderHook(() => useFetchWrapper(() => "https://api.example.com"));
      result.current.fetch("me/genres/", true, true, { method: "PUT" });
      const handleError = rawFetchMock.mock.calls[0][6] as (error: Error) => void;
      const error = new BackendError(ErrorCode.BACKEND_NOT_FOUND);

      expect(() => handleError(error)).not.toThrow();
      expect(setConnectivityErrorMock).toHaveBeenCalledWith(error);
    });

    it("still raises the global connectivity error for a 500", () => {
      const handleError = getHandleError();
      const error = new BackendError(ErrorCode.BACKEND_INTERNAL_ERROR);

      expect(() => handleError(error)).not.toThrow();
      expect(setConnectivityErrorMock).toHaveBeenCalledWith(error);
    });

    it("sets the connectivity error without throwing for a regular BackendError code", () => {
      const handleError = getHandleError();
      const error = new BackendError(ErrorCode.BACKEND_AUTH_ERROR);

      expect(() => handleError(error)).not.toThrow();
      expect(setConnectivityErrorMock).toHaveBeenCalledWith(error);
    });
  });
});
