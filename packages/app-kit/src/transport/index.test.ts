import { describe, it, expect } from "vitest";

import * as transport from "./index";

describe("transport barrel", () => {
  it("re-exports the package's public transport surface", () => {
    expect(transport.AppError).toBeDefined();
    expect(transport.fetchWrapper).toBeTypeOf("function");
    expect(transport.useFetchWrapper).toBeTypeOf("function");
    expect(transport.queryClient).toBeDefined();
    expect(transport.buildBackendBaseUrl).toBeTypeOf("function");
    expect(transport.ConnectivityErrorProvider).toBeTypeOf("function");
    expect(transport.useConnectivityError).toBeTypeOf("function");
    expect(transport.parseWithLog).toBeTypeOf("function");
    expect(transport.PaginatedResponseSchema).toBeTypeOf("function");
    expect(transport.useQueryWithParse).toBeTypeOf("function");
    expect(transport.useValidatedMutation).toBeTypeOf("function");
  });
});
