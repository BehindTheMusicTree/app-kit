import { describe, it, expect, beforeEach, vi } from "vitest";
import { AppError } from "./app-errors/app-error";
import { ErrorCode } from "./app-errors/app-error-codes";

const { createAppErrorFromResultMock, createNetworkOrBackendErrorMock } = vi.hoisted(() => ({
  createAppErrorFromResultMock: vi.fn(),
  createNetworkOrBackendErrorMock: vi.fn(),
}));

vi.mock("./app-errors/app-error-factory", () => ({
  createAppErrorFromResult: (...args: unknown[]) => createAppErrorFromResultMock(...args),
  createNetworkOrBackendError: (...args: unknown[]) => createNetworkOrBackendErrorMock(...args),
}));

import { fetchWrapper } from "./fetch-wrapper";

describe("fetchWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
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

    await fetchWrapper("things/", false, { body }, "abc123");

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

  it("calls handleError and returns null for a non-ok response when handleError is provided", async () => {
    const response = { ok: false } as unknown as Response;
    vi.mocked(fetch).mockResolvedValue(response);
    const appError = new AppError(ErrorCode.BACKEND_AUTH_ERROR);
    createAppErrorFromResultMock.mockResolvedValue(appError);
    const handleError = vi.fn();

    const result = await fetchWrapper("things/", false, {}, undefined, undefined, undefined, handleError);

    expect(result).toBeNull();
    expect(handleError).toHaveBeenCalledWith(appError);
  });

  it("wraps a thrown non-AppError network failure via createNetworkOrBackendError and throws it", async () => {
    const networkFailure = new TypeError("Failed to fetch");
    vi.mocked(fetch).mockRejectedValue(networkFailure);
    const appError = new AppError(ErrorCode.BACKEND_AUTH_ERROR);
    createNetworkOrBackendErrorMock.mockReturnValue(appError);

    await expect(fetchWrapper("things/", false)).rejects.toBe(appError);
    expect(createNetworkOrBackendErrorMock).toHaveBeenCalledWith(networkFailure, "things/", undefined);
  });

  it("calls handleError for a wrapped network failure when handleError is provided", async () => {
    const networkFailure = new TypeError("Failed to fetch");
    vi.mocked(fetch).mockRejectedValue(networkFailure);
    const appError = new AppError(ErrorCode.BACKEND_AUTH_ERROR);
    createNetworkOrBackendErrorMock.mockReturnValue(appError);
    const handleError = vi.fn();

    const result = await fetchWrapper("things/", false, {}, undefined, undefined, undefined, handleError);

    expect(result).toBeNull();
    expect(handleError).toHaveBeenCalledWith(appError);
  });

  it("passes backendBaseUrl through to the error factories", async () => {
    const response = { ok: false } as unknown as Response;
    vi.mocked(fetch).mockResolvedValue(response);
    createAppErrorFromResultMock.mockResolvedValue(new AppError(ErrorCode.BACKEND_AUTH_ERROR));
    const handleError = vi.fn();

    await fetchWrapper(
      "things/",
      false,
      {},
      undefined,
      undefined,
      undefined,
      handleError,
      false,
      "https://backend.example.com",
    );

    expect(createAppErrorFromResultMock).toHaveBeenCalledWith(response, "https://backend.example.com");
  });
});
