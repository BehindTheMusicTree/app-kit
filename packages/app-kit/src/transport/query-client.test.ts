import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryClient } from "./query-client";

describe("queryClient", () => {
  it("is a QueryClient instance", () => {
    expect(queryClient).toBeInstanceOf(QueryClient);
  });

  it("has the expected default query options", () => {
    const defaults = queryClient.getDefaultOptions();

    expect(defaults.queries?.staleTime).toBe(60 * 1000);
    expect(defaults.queries?.retry).toBe(false);
  });
});
