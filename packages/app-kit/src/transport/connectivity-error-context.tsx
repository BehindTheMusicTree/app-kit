"use client";

import { ConnectivityError } from "./app-errors/app-error";
import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

interface ConnectivityErrorContextType {
  connectivityError: ConnectivityError | null;
  setConnectivityError: (error: ConnectivityError | null) => void;
  clearConnectivityError: () => void;
}

const ConnectivityErrorContext = createContext<ConnectivityErrorContextType | undefined>(undefined);

interface ConnectivityErrorProviderProps {
  children: ReactNode;
}

export function ConnectivityErrorProvider({ children }: ConnectivityErrorProviderProps) {
  const [connectivityError, setConnectivityError] = useState<ConnectivityError | null>(null);

  const clearConnectivityError = useCallback(() => {
    setConnectivityError(null);
  }, []);

  const handleSetConnectivityError = useCallback((error: ConnectivityError | null) => {
    setConnectivityError(error);
  }, []);

  const value = useMemo(
    () => ({
      connectivityError,
      setConnectivityError: handleSetConnectivityError,
      clearConnectivityError,
    }),
    [connectivityError, handleSetConnectivityError, clearConnectivityError],
  );

  return <ConnectivityErrorContext.Provider value={value}>{children}</ConnectivityErrorContext.Provider>;
}

export function useConnectivityError() {
  const context = useContext(ConnectivityErrorContext);
  if (context === undefined) {
    throw new Error("useConnectivityError must be used within a ConnectivityErrorProvider");
  }
  return context;
}
