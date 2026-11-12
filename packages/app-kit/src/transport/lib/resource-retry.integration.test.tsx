import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthRequired, NetworkError } from "../app-errors/app-error";
import { ErrorCode } from "../app-errors/app-error-codes";
import { resourceRetry } from "./resource-result";

const run = (queryFn: () => Promise<unknown>) => {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(
    () => useQuery({ queryKey: ["r"], queryFn, retry: resourceRetry, retryDelay: 0 }),
    { wrapper },
  );
};

describe("resourceRetry with a real query", () => {
  it("fetches once and ends in AuthRequired on 401 BAC4010", async () => {
    const queryFn = vi.fn().mockRejectedValue(new AuthRequired(ErrorCode.BACKEND_UNAUTHORIZED));
    const { result } = run(queryFn);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeInstanceOf(AuthRequired);
  });

  it("still retries network failures up to three times", async () => {
    const queryFn = vi.fn().mockRejectedValue(new NetworkError(ErrorCode.NETWORK_ERROR));
    const { result } = run(queryFn);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryFn).toHaveBeenCalledTimes(4);
  });
});
