import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { clearSessionMock, clearConnectivityErrorMock } = vi.hoisted(() => ({
  clearSessionMock: vi.fn(),
  clearConnectivityErrorMock: vi.fn(),
}));

vi.mock("./SessionContext", () => ({
  useSession: () => ({ clearSession: clearSessionMock }),
}));

vi.mock("../transport/connectivity-error-context", () => ({
  useConnectivityError: () => ({ clearConnectivityError: clearConnectivityErrorMock }),
}));

import { useLogout } from "./useLogout";

describe("useLogout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a logout function that clears the connectivity error and the session", () => {
    const { result } = renderHook(() => useLogout());

    result.current.logout();

    expect(clearConnectivityErrorMock).toHaveBeenCalled();
    expect(clearSessionMock).toHaveBeenCalled();
  });
});
