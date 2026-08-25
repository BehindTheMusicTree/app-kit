import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { z } from "zod";

const { useQueryMock, parseWithLogMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  parseWithLogMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: unknown) => {
      useQueryMock(options);
      return { data: undefined, isLoading: false };
    },
  };
});

vi.mock("./parse-with-log", () => ({
  parseWithLog: (...args: unknown[]) => parseWithLogMock(...args),
}));

import { useQueryWithParse } from "./use-query-with-parse";

const schema = z.object({ id: z.string() });

describe("useQueryWithParse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes through non-queryFn options to useQuery", () => {
    const queryFn = vi.fn();
    renderHook(() => useQueryWithParse({ queryKey: ["thing"], queryFn, schema, enabled: false }));

    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.queryKey).toEqual(["thing"]);
    expect(passedOptions.enabled).toBe(false);
  });

  it("wraps queryFn to parse the response through the schema with context", async () => {
    const queryFn = vi.fn().mockResolvedValue({ raw: true });
    parseWithLogMock.mockReturnValue({ id: "abc" });
    renderHook(() => useQueryWithParse({ queryKey: ["thing"], queryFn, schema, context: "thing-query" }));

    const wrappedQueryFn = useQueryMock.mock.calls[0][0].queryFn;
    const result = await wrappedQueryFn();

    expect(queryFn).toHaveBeenCalled();
    expect(parseWithLogMock).toHaveBeenCalledWith(schema, { raw: true }, "thing-query");
    expect(result).toEqual({ id: "abc" });
  });

  it("wraps queryFn to parse the response through the schema without context", async () => {
    const queryFn = vi.fn().mockResolvedValue({ raw: true });
    parseWithLogMock.mockReturnValue({ id: "abc" });
    renderHook(() => useQueryWithParse({ queryKey: ["thing"], queryFn, schema }));

    const wrappedQueryFn = useQueryMock.mock.calls[0][0].queryFn;
    await wrappedQueryFn();

    expect(parseWithLogMock).toHaveBeenCalledWith(schema, { raw: true }, undefined);
  });
});
