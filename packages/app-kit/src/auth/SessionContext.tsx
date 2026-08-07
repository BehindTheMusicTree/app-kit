"use client";

import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from "react";
import { Session } from "./Session";
import { queryClient } from "../transport/query-client";
import { clearSpotifyRequiredCached } from "./spotify-required-cache";

interface SessionContextType {
  session: Session;
  setSession: (session: Session) => void;
  clearSession: () => void;
  sessionRestored: boolean;
}

const defaultSession: Session = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

const SESSION_STORAGE_KEY = "session"; // Persists session across refresh (localStorage)

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSessionState] = useState<Session>(defaultSession);
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        setSessionState(parsed);
        if (parsed?.accessToken) {
          queryClient.invalidateQueries();
        }
      } catch {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
    setSessionRestored(true);
  }, []);

  const setSession = useCallback((newSession: Session) => {
    setSessionState(newSession);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(defaultSession);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    clearSpotifyRequiredCached();
    queryClient.clear();
  }, []);

  const value = useMemo(
    () => ({ session, setSession, clearSession, sessionRestored }),
    [session, setSession, clearSession, sessionRestored],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
