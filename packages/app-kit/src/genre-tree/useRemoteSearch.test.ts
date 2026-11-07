import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { z } from "zod";

const { useQueryWithParseMock } = vi.hoisted(() => ({ useQueryWithParseMock: vi.fn() }));

vi.mock("../transport/useFetchWrapper", () => ({
  useFetchWrapper: () => ({ fetch: vi.fn() }),
}));

vi.mock("../transport/lib/use-query-with-parse", () => ({
  useQueryWithParse: (options: unknown) => useQueryWithParseMock(options),
}));

import { useRemoteSearch } from "./useRemoteSearch";

const render = (scope?: string) =>
  renderHook(
    ({ scope }) =>
      useRemoteSearch(() => "https://backend.example.com", {
        queryKey: (q) => ["search", q, scope],
        endpoint: "search/",
        params: (q) => ({ q }),
        schema: z.array(z.string()),
        context: "test",
        text: "taylor",
        scope,
      }),
    { initialProps: { scope } },
  );

const placeholder = () => useQueryWithParseMock.mock.calls.at(-1)?.[0].placeholderData("previous");

describe("useRemoteSearch scope", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useQueryWithParseMock.mockReset();
    useQueryWithParseMock.mockReturnValue({ data: ["a"], isFetching: false, isError: false, isPlaceholderData: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps previous results while the scope is unchanged", () => {
    const { rerender } = render("key-1");
    act(() => {
      vi.advanceTimersByTime(250);
    });

    rerender({ scope: "key-1" });

    expect(placeholder()).toBe("previous");
  });

  it("drops previous results once the scope changes, until results for the new scope arrive", () => {
    const { rerender } = render("key-1");
    act(() => {
      vi.advanceTimersByTime(250);
    });

    useQueryWithParseMock.mockReturnValue({ data: undefined, isFetching: true, isError: false, isPlaceholderData: false });
    rerender({ scope: "key-2" });
    expect(placeholder()).toBeUndefined();

    useQueryWithParseMock.mockReturnValue({ data: ["b"], isFetching: false, isError: false, isPlaceholderData: false });
    rerender({ scope: "key-2" });
    rerender({ scope: "key-2" });
    expect(placeholder()).toBe("previous");
  });

  it("does not adopt a scope from placeholder data", () => {
    const { rerender } = render("key-1");
    act(() => {
      vi.advanceTimersByTime(250);
    });

    useQueryWithParseMock.mockReturnValue({ data: ["a"], isFetching: true, isError: false, isPlaceholderData: true });
    rerender({ scope: "key-2" });
    rerender({ scope: "key-2" });

    expect(placeholder()).toBeUndefined();
  });
});
