"use client";

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

interface TrackListSidebarVisibilityContextType {
  isTrackListSidebarVisible: boolean;
  toggleTrackListSidebar: () => void;
  showTrackListSidebar: () => void;
  hideTrackListSidebar: () => void;
}

const TrackListSidebarVisibilityContext = createContext<TrackListSidebarVisibilityContextType | undefined>(undefined);

interface TrackListSidebarVisibilityProviderProps {
  children: ReactNode;
}

export function TrackListSidebarVisibilityProvider({ children }: TrackListSidebarVisibilityProviderProps) {
  const [isTrackListSidebarVisible, setIsTrackListSidebarVisible] = useState(false);

  const toggleTrackListSidebar = useCallback(() => {
    setIsTrackListSidebarVisible((prev) => !prev);
  }, []);

  const showTrackListSidebar = useCallback(() => {
    setIsTrackListSidebarVisible(true);
  }, []);

  const hideTrackListSidebar = useCallback(() => {
    setIsTrackListSidebarVisible(false);
  }, []);

  const value = useMemo(
    () => ({
      isTrackListSidebarVisible,
      toggleTrackListSidebar,
      showTrackListSidebar,
      hideTrackListSidebar,
    }),
    [isTrackListSidebarVisible, toggleTrackListSidebar, showTrackListSidebar, hideTrackListSidebar],
  );

  return (
    <TrackListSidebarVisibilityContext.Provider value={value}>{children}</TrackListSidebarVisibilityContext.Provider>
  );
}

export function useTrackListSidebarVisibility() {
  const context = useContext(TrackListSidebarVisibilityContext);
  if (context === undefined) {
    throw new Error("useTrackListSidebarVisibility must be used within a TrackListSidebarVisibilityProvider");
  }
  return context;
}
