"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { z } from "zod";

export const PlaybackContextSchema = z.object({ country: z.string().regex(/^[A-Z]{2}$/).nullable() });

const unmanaged = {
  country: null as string | null,
  key: null as string | null,
  ready: true,
  error: null as string | null,
  isCurrent: (_key: string | null) => true,
  snapshot: () => ({ key: null as string | null, country: null as string | null }),
  refresh: async (_force = false) => null as string | null,
};
const PlaybackContext = createContext(unmanaged);
export const usePlaybackContext = () => useContext(PlaybackContext);

export function PlaybackContextProvider({ children, loadContext }: {
  children: ReactNode;
  loadContext: () => Promise<unknown>;
}) {
  const [state, setState] = useState({
    country: null as string | null,
    ready: false,
    revision: 0,
    error: null as string | null,
  });
  const current = useRef(state);
  const checkedAt = useRef(0);
  const pending = useRef<Promise<string | null> | null>(null);
  const refresh = useCallback((force = false): Promise<string | null> => {
    if (pending.current) return pending.current;
    if (!force && current.current.ready && Date.now() - checkedAt.current < 60_000) {
      return Promise.resolve(current.current.country);
    }
    pending.current = loadContext()
      .then((raw) => {
        const { country } = PlaybackContextSchema.parse(raw);
        const previous = current.current;
        const next = {
          country,
          ready: true,
          error: null,
          revision: previous.revision + (country !== previous.country ? 1 : 0),
        };
        current.current = next;
        checkedAt.current = Date.now();
        setState(next);
        return country;
      })
      .catch((error: unknown) => {
        const next = {
          ...current.current,
          error: error instanceof Error ? error.message : "Unable to check playback location",
        };
        current.current = next;
        setState(next);
        throw error;
      })
      .finally(() => { pending.current = null; });
    return pending.current;
  }, [loadContext]);

  useEffect(() => {
    const update = () => { void refresh(true).catch(() => {}); };
    update();
    window.addEventListener("focus", update);
    window.addEventListener("online", update);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("online", update);
    };
  }, [refresh]);

  const isCurrent = useCallback(
    (key: string | null) => key === `${current.current.country ?? "unknown"}:${current.current.revision}`,
    [],
  );
  const snapshot = useCallback(() => ({
    key: `${current.current.country ?? "unknown"}:${current.current.revision}`,
    country: current.current.country,
  }), []);
  const value = useMemo(() => ({
    ...state,
    isCurrent,
    snapshot,
    key: `${state.country ?? "unknown"}:${state.revision}`,
    refresh,
  }), [state, refresh, isCurrent, snapshot]);
  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}
