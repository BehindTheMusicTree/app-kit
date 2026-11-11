import { describe, it, expect } from "vitest";
import { BackendError } from "../app-errors/app-error";
import { ErrorCode } from "../app-errors/app-error-codes";
import { resourceRetry, toResourceResult } from "./resource-result";

const base = { id: "id-1", isValidId: true, data: undefined, error: null, isPending: false };
const notFound = new BackendError(ErrorCode.BACKEND_NOT_FOUND);

describe("toResourceResult", () => {
  it("is idle without an id", () => {
    expect(toResourceResult({ ...base, id: null })).toEqual({ status: "idle" });
  });

  it("is not found for an invalid id, even without an error", () => {
    expect(toResourceResult({ ...base, isValidId: false, isPending: true })).toEqual({ status: "not-found" });
  });

  it("is not found on a 404 and an error on any other failure", () => {
    expect(toResourceResult({ ...base, error: notFound })).toEqual({ status: "not-found" });
    expect(toResourceResult({ ...base, error: new Error("boom") })).toEqual({ status: "error" });
  });

  it("is loading while pending or without data", () => {
    expect(toResourceResult({ ...base, isPending: true })).toEqual({ status: "loading" });
    expect(toResourceResult({ ...base })).toEqual({ status: "loading" });
  });

  it("carries the data on success", () => {
    expect(toResourceResult({ ...base, data: { a: 1 } })).toEqual({ status: "success", data: { a: 1 } });
  });
});

describe("resourceRetry", () => {
  it("never retries a 404", () => {
    expect(resourceRetry(0, notFound)).toBe(false);
  });

  it("retries other failures up to three times", () => {
    expect(resourceRetry(2, new Error("boom"))).toBe(true);
    expect(resourceRetry(3, new Error("boom"))).toBe(false);
  });
});
