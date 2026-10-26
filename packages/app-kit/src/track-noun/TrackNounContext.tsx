"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";

export interface TrackNoun {
  singular: string;
  plural: string;
}

const TrackNounContext = createContext<TrackNoun | undefined>(undefined);

interface TrackNounProviderProps extends TrackNoun {
  children: ReactNode;
}

export function TrackNounProvider({ singular, plural, children }: TrackNounProviderProps) {
  const value = useMemo(() => ({ singular, plural }), [singular, plural]);
  return <TrackNounContext.Provider value={value}>{children}</TrackNounContext.Provider>;
}

export function useTrackNoun() {
  const context = useContext(TrackNounContext);
  if (context === undefined) {
    throw new Error("useTrackNoun must be used within a TrackNounProvider");
  }
  return context;
}

export function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
