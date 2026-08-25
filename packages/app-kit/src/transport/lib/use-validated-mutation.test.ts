import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { z } from "zod";

const { useMutationMock } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useMutation: (options: unknown) => {
      useMutationMock(options);
      return { isPending: false, isSuccess: false, isError: false };
    },
  };
});

import { useValidatedMutation } from "./use-validated-mutation";

const inputSchema = z.object({ name: z.string() });
const outputSchema = z.object({ id: z.string() });

describe("useValidatedMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets field errors and throws when input validation fails", async () => {
    const mutationFn = vi.fn();
    const { result, rerender } = renderHook(() => useValidatedMutation({ inputSchema, outputSchema, mutationFn }));
    const capturedMutationFn = useMutationMock.mock.calls[0][0].mutationFn;

    await act(async () => {
      await expect(capturedMutationFn({})).rejects.toThrow("Invalid input data");
    });
    rerender();

    expect(mutationFn).not.toHaveBeenCalled();
    expect(result.current.formErrors).toEqual([{ field: "name", message: expect.any(String) }]);
  });

  it("returns the parsed output when input and output are both valid", async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: "abc" });
    const { result, rerender } = renderHook(() => useValidatedMutation({ inputSchema, outputSchema, mutationFn }));
    const capturedMutationFn = useMutationMock.mock.calls[0][0].mutationFn;

    let output: unknown;
    await act(async () => {
      output = await capturedMutationFn({ name: "Alice" });
    });
    rerender();

    expect(mutationFn).toHaveBeenCalledWith({ name: "Alice" });
    expect(output).toEqual({ id: "abc" });
    expect(result.current.formErrors).toEqual([]);
  });

  it("sets a generic form error and throws when output validation fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mutationFn = vi.fn().mockResolvedValue({ notAnId: 1 });
    const { result, rerender } = renderHook(() => useValidatedMutation({ inputSchema, outputSchema, mutationFn }));
    const capturedMutationFn = useMutationMock.mock.calls[0][0].mutationFn;

    await act(async () => {
      await expect(capturedMutationFn({ name: "Alice" })).rejects.toThrow("Invalid response from server");
    });
    rerender();

    expect(result.current.formErrors).toEqual([{ field: "form", message: "Invalid response from server" }]);
    consoleErrorSpy.mockRestore();
  });

  it("maps backend field errors from a thrown error's json payload and rethrows", async () => {
    const backendError = Object.assign(new Error("bad request"), {
      json: { details: { fieldErrors: { name: [{ message: "Name is taken" }] } } },
    });
    const mutationFn = vi.fn().mockRejectedValue(backendError);
    const { result, rerender } = renderHook(() => useValidatedMutation({ inputSchema, outputSchema, mutationFn }));
    const capturedMutationFn = useMutationMock.mock.calls[0][0].mutationFn;

    await act(async () => {
      await expect(capturedMutationFn({ name: "Alice" })).rejects.toBe(backendError);
    });
    rerender();

    expect(result.current.formErrors).toEqual([{ field: "name", message: "Name is taken" }]);
  });

  it("sets a generic form error when the thrown error's json payload doesn't match the expected shape", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const backendError = Object.assign(new Error("bad request"), { json: { unexpected: true } });
    const mutationFn = vi.fn().mockRejectedValue(backendError);
    const { result, rerender } = renderHook(() => useValidatedMutation({ inputSchema, outputSchema, mutationFn }));
    const capturedMutationFn = useMutationMock.mock.calls[0][0].mutationFn;

    await act(async () => {
      await expect(capturedMutationFn({ name: "Alice" })).rejects.toBe(backendError);
    });
    rerender();

    expect(result.current.formErrors).toEqual([{ field: "form", message: "An error occurred" }]);
    consoleErrorSpy.mockRestore();
  });

  it("rethrows without touching form errors when the thrown error has no json property", async () => {
    const plainError = new Error("network down");
    const mutationFn = vi.fn().mockRejectedValue(plainError);
    const { result, rerender } = renderHook(() => useValidatedMutation({ inputSchema, outputSchema, mutationFn }));
    const capturedMutationFn = useMutationMock.mock.calls[0][0].mutationFn;

    await act(async () => {
      await expect(capturedMutationFn({ name: "Alice" })).rejects.toBe(plainError);
    });
    rerender();

    expect(result.current.formErrors).toEqual([]);
  });

  it("rethrows a non-Error rejection without touching form errors", async () => {
    const mutationFn = vi.fn().mockRejectedValue("plain string rejection");
    const { result, rerender } = renderHook(() => useValidatedMutation({ inputSchema, outputSchema, mutationFn }));
    const capturedMutationFn = useMutationMock.mock.calls[0][0].mutationFn;

    await act(async () => {
      await expect(capturedMutationFn({ name: "Alice" })).rejects.toBe("plain string rejection");
    });
    rerender();

    expect(result.current.formErrors).toEqual([]);
  });
});
