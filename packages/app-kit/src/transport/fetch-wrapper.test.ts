import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AppError, ClientError } from "./app-errors/app-error";
import { ErrorCode } from "./app-errors/app-error-codes";

const { createAppErrorFromResultMock, createNetworkOrBackendErrorMock } = vi.hoisted(() => ({
  createAppErrorFromResultMock: vi.fn(),
  createNetworkOrBackendErrorMock: vi.fn(),
}));

vi.mock("./app-errors/app-error-factory", async (importOriginal) => ({
  createAppErrorFromErrorCode: (await importOriginal<typeof import("./app-errors/app-error-factory")>())
    .createAppErrorFromErrorCode,
  createAppErrorFromResult: (...args: unknown[]) => createAppErrorFromResultMock(...args),
  createNetworkOrBackendError: (...args: unknown[]) => createNetworkOrBackendErrorMock(...args),
}));

import { fetchWrapper } from "./fetch-wrapper";

describe("fetchWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed json when the response is ok", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) } as unknown as Response);

    const result = await fetchWrapper("things/", false);

    expect(result).toEqual({ id: 1 });
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "things/",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
  });

  it.each([200, 404, 500])("discards stale responses before parsing status %s or raising global errors", async (status) => {
    const response = new Response("{}", { status });
    const json = vi.spyOn(response, "json");
    vi.mocked(fetch).mockResolvedValue(response);
    const handleError = vi.fn();
    const aborted = new DOMException("Playback context changed", "AbortError");
    const onResponse = vi.fn(async () => { throw aborted; });

    await expect(fetchWrapper(
      "things/", false, {}, undefined, undefined, undefined, handleError, false, undefined, onResponse,
    )).rejects.toBe(aborted);

    expect(json).not.toHaveBeenCalled();
    expect(createAppErrorFromResultMock).not.toHaveBeenCalled();
    expect(createNetworkOrBackendErrorMock).not.toHaveBeenCalled();
    expect(handleError).not.toHaveBeenCalled();
  });

  it("returns null without reading the body for a 204 No Content response", async () => {
    const json = vi.fn();
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 204, json } as unknown as Response);

    expect(await fetchWrapper("things/", false)).toBeNull();
    expect(json).not.toHaveBeenCalled();
  });

  it("returns an array buffer when expectBinary is true", async () => {
    const buffer = new ArrayBuffer(4);
    vi.mocked(fetch).mockResolvedValue({ ok: true, arrayBuffer: async () => buffer } as unknown as Response);

    const result = await fetchWrapper("things/file", false, {}, undefined, undefined, undefined, undefined, true);

    expect(result).toBe(buffer);
  });

  it("appends query params with '?' when the url has none", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as unknown as Response);

    await fetchWrapper("things/", false, {}, undefined, { page: 2, active: true });

    expect(vi.mocked(fetch)).toHaveBeenCalledWith("things/?page=2&active=true", expect.anything());
  });

  it("appends query params with '&' when the url already has a query string", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as unknown as Response);

    await fetchWrapper("things/?existing=1", false, {}, undefined, { page: 2 });

    expect(vi.mocked(fetch)).toHaveBeenCalledWith("things/?existing=1&page=2", expect.anything());
  });

  it("omits Content-Type and sets the Authorization header for FormData bodies with a token", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as unknown as Response);
    const body = new FormData();

    await fetchWrapper("things/", false, { method: "POST", body }, "abc123");

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).headers).toEqual({ Authorization: "Bearer abc123" });
  });

  it("merges caller-supplied headers over the defaults", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as unknown as Response);

    await fetchWrapper("things/", false, { headers: { "X-Custom": "1" } });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).headers).toEqual({ "Content-Type": "application/json", "X-Custom": "1" });
  });

  it("returns null and calls handleMissingRequiredSession when auth is required but there's no token", async () => {
    const handleMissingRequiredSession = vi.fn();

    const result = await fetchWrapper("things/", true, {}, undefined, undefined, handleMissingRequiredSession);

    expect(result).toBeNull();
    expect(handleMissingRequiredSession).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not throw when handleMissingRequiredSession is not provided and auth is required with no token", async () => {
    const result = await fetchWrapper("things/", true);

    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("proceeds to fetch when requiresAuth is false even without a token", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ ok: 1 }) } as unknown as Response);

    const result = await fetchWrapper("things/", false);

    expect(result).toEqual({ ok: 1 });
  });

  it("throws the app error from a non-ok response when there is no handleError", async () => {
    const response = { ok: false } as unknown as Response;
    vi.mocked(fetch).mockResolvedValue(response);
    const appError = new AppError(ErrorCode.BACKEND_AUTH_ERROR);
    createAppErrorFromResultMock.mockResolvedValue(appError);

    await expect(fetchWrapper("things/", false)).rejects.toBe(appError);
    expect(createAppErrorFromResultMock).toHaveBeenCalledWith(response, undefined);
  });

  it("calls handleError then rejects with the app error for a non-ok GET, so callers keep the typed error", async () => {
    const response = { ok: false } as unknown as Response;
    vi.mocked(fetch).mockResolvedValue(response);
    const appError = new AppError(ErrorCode.BACKEND_AUTH_ERROR);
    createAppErrorFromResultMock.mockResolvedValue(appError);
    const handleError = vi.fn();

    await expect(
      fetchWrapper("things/", false, {}, undefined, undefined, undefined, handleError),
    ).rejects.toBe(appError);

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith(appError);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "calls handleError and still throws for a non-ok %s response",
    async (method) => {
      vi.mocked(fetch).mockResolvedValue({ ok: false } as unknown as Response);
      const appError = new AppError(ErrorCode.BACKEND_AUTH_ERROR);
      createAppErrorFromResultMock.mockResolvedValue(appError);
      const handleError = vi.fn();

      await expect(
        fetchWrapper("things/", false, { method }, undefined, undefined, undefined, handleError),
      ).rejects.toBe(appError);

      expect(handleError).toHaveBeenCalledWith(appError);
    },
  );

  it("wraps a thrown non-AppError network failure via createNetworkOrBackendError and throws it", async () => {
    const networkFailure = new TypeError("Failed to fetch");
    vi.mocked(fetch).mockRejectedValue(networkFailure);
    const appError = new AppError(ErrorCode.BACKEND_AUTH_ERROR);
    createNetworkOrBackendErrorMock.mockReturnValue(appError);

    vi.useFakeTimers();
    const assertion = expect(fetchWrapper("things/", false)).rejects.toBe(appError);
    await vi.runAllTimersAsync();
    await assertion;
    vi.useRealTimers();
    expect(createNetworkOrBackendErrorMock).toHaveBeenCalledWith(networkFailure, "things/", undefined);
  });

  it("calls handleError for a wrapped network failure when handleError is provided", async () => {
    const networkFailure = new TypeError("Failed to fetch");
    vi.mocked(fetch).mockRejectedValue(networkFailure);
    const appError = new AppError(ErrorCode.BACKEND_AUTH_ERROR);
    createNetworkOrBackendErrorMock.mockReturnValue(appError);
    const handleError = vi.fn();
    vi.useFakeTimers();

    const pending = fetchWrapper("things/", false, {}, undefined, undefined, undefined, handleError);
    const settled = expect(pending).rejects.toBe(appError);
    await vi.runAllTimersAsync();
    await settled;
    vi.useRealTimers();

    expect(handleError).toHaveBeenCalledWith(appError);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it("retries a GET once the network recovers", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) } as unknown as Response);

    const pending = fetchWrapper("things/", false);
    await vi.runAllTimersAsync();
    const result = await pending;
    vi.useRealTimers();

    expect(result).toEqual({ id: 1 });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("throws a ClientError without calling fetch when the request is malformed", async () => {
    const pending = fetchWrapper("things/", false, { headers: { "X-Custom": "a\nb" } });

    await expect(pending).rejects.toBeInstanceOf(ClientError);
    await expect(pending).rejects.toMatchObject({
      code: ErrorCode.CLIENT_INTERNAL_ERROR,
      cause: expect.any(TypeError),
    });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("rejects a body on a lowercase get without encoding the body", async () => {
    const body = { toString: vi.fn(() => "x") } as unknown as BodyInit;

    await expect(fetchWrapper("things/", false, { method: "get", body })).rejects.toBeInstanceOf(ClientError);
    expect(body.toString).not.toHaveBeenCalled();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("skips validation when the Request global is missing", async () => {
    vi.stubGlobal("Request", undefined);
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) } as unknown as Response);

    const result = await fetchWrapper("things/", false, { headers: { "X-Custom": "a\nb" } });

    expect(result).toEqual({ id: 1 });
  });

  it("does not turn a non-TypeError from Request into a ClientError", async () => {
    vi.stubGlobal(
      "Request",
      vi.fn(function () {
        throw new ReferenceError("boom");
      }),
    );
    createNetworkOrBackendErrorMock.mockReturnValue(new AppError(ErrorCode.NETWORK_FAILED_TO_FETCH));

    await expect(fetchWrapper("things/", false)).rejects.toMatchObject({ code: ErrorCode.NETWORK_FAILED_TO_FETCH });
    expect(createNetworkOrBackendErrorMock).toHaveBeenCalledWith(expect.any(ReferenceError), "things/", undefined);
  });

  it("passes a malformed-request ClientError to handleError", async () => {
    const handleError = vi.fn();

    await expect(
      fetchWrapper("things/", false, { body: "x" }, undefined, undefined, undefined, handleError),
    ).rejects.toMatchObject({ code: ErrorCode.CLIENT_INTERNAL_ERROR });

    expect(handleError).toHaveBeenCalledWith(expect.objectContaining({ code: ErrorCode.CLIENT_INTERNAL_ERROR }));
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("does not retry a POST network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    createNetworkOrBackendErrorMock.mockReturnValue(new AppError(ErrorCode.BACKEND_AUTH_ERROR));
    const handleError = vi.fn();

    await expect(
      fetchWrapper("things/", false, { method: "POST" }, undefined, undefined, undefined, handleError),
    ).rejects.toBeInstanceOf(AppError);

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalled();
  });

  it("does not retry a GET aborted by its signal", async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted = new DOMException("Aborted", "AbortError");
    vi.mocked(fetch).mockRejectedValue(aborted);
    const handleError = vi.fn();

    await expect(fetchWrapper("things/", false, { signal: controller.signal }, undefined, undefined, undefined, handleError)).rejects.toBe(aborted);

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(handleError).not.toHaveBeenCalled();
  });

  it("rethrows a caller abort without reporting it as a connectivity error", async () => {
    const controller = new AbortController();
    controller.abort();
    const abortError = new DOMException("Aborted", "AbortError");
    vi.mocked(fetch).mockRejectedValue(abortError);
    const handleError = vi.fn();

    await expect(
      fetchWrapper("things/", false, { signal: controller.signal }, undefined, undefined, undefined, handleError),
    ).rejects.toBe(abortError);

    expect(handleError).not.toHaveBeenCalled();
    expect(createNetworkOrBackendErrorMock).not.toHaveBeenCalled();
  });

  it("rethrows a caller abort with a custom reason without reporting it", async () => {
    const controller = new AbortController();
    const reason = new Error("superseded");
    controller.abort(reason);
    vi.mocked(fetch).mockRejectedValue(reason);
    const handleError = vi.fn();

    await expect(
      fetchWrapper("things/", false, { signal: controller.signal }, undefined, undefined, undefined, handleError),
    ).rejects.toBe(reason);

    expect(handleError).not.toHaveBeenCalled();
  });

  it("reports a timeout signal as a failure", async () => {
    const controller = new AbortController();
    controller.abort(new DOMException("Timed out", "TimeoutError"));
    vi.mocked(fetch).mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
    createNetworkOrBackendErrorMock.mockReturnValue(new AppError(ErrorCode.NETWORK_TIMEOUT));
    const handleError = vi.fn();

    await expect(
      fetchWrapper("things/", false, { signal: controller.signal }, undefined, undefined, undefined, handleError),
    ).rejects.toBeInstanceOf(AppError);

    expect(handleError).toHaveBeenCalled();
  });

  it("still reports an AbortError when the caller's signal was not aborted", async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException("Aborted", "AbortError"));
    createNetworkOrBackendErrorMock.mockReturnValue(new AppError(ErrorCode.NETWORK_ABORT_ERROR));
    const handleError = vi.fn();

    await expect(
      fetchWrapper(
        "things/",
        false,
        { method: "POST", signal: new AbortController().signal },
        undefined,
        undefined,
        undefined,
        handleError,
      ),
    ).rejects.toBeInstanceOf(AppError);

    expect(handleError).toHaveBeenCalled();
  });

  it("does not retry a GET that gets an error response", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as unknown as Response);
    createAppErrorFromResultMock.mockResolvedValue(new AppError(ErrorCode.BACKEND_AUTH_ERROR));

    await expect(fetchWrapper("things/", false, {}, undefined, undefined, undefined, vi.fn())).rejects.toBeInstanceOf(AppError);

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("passes backendBaseUrl through to the error factories", async () => {
    const response = { ok: false } as unknown as Response;
    vi.mocked(fetch).mockResolvedValue(response);
    createAppErrorFromResultMock.mockResolvedValue(new AppError(ErrorCode.BACKEND_AUTH_ERROR));
    const handleError = vi.fn();

    await expect(fetchWrapper(
      "things/",
      false,
      {},
      undefined,
      undefined,
      undefined,
      handleError,
      false,
      "https://backend.example.com",
    )).rejects.toBeInstanceOf(AppError);

    expect(createAppErrorFromResultMock).toHaveBeenCalledWith(response, "https://backend.example.com");
  });
});
