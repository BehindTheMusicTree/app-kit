"use client";

import { useCallback } from "react";

import { useSession } from "./SessionContext";
import { useConnectivityError } from "../transport/connectivity-error-context";
import { createLogout } from "./code-exchange";

export function useLogout() {
  const { clearSession } = useSession();
  const { clearConnectivityError } = useConnectivityError();

  const logout = useCallback(
    createLogout(clearConnectivityError, clearSession),
    [clearConnectivityError, clearSession],
  );

  return { logout };
}
