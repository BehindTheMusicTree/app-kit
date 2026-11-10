import type { ReactNode } from "react";

/** A detail panel shown in the shared DetailPanel in place of a genre's: an artist, a song or a host page. */
export interface OverlayPanel {
  /** Plain text, like a genre's name: it fills the search field, whose clear button closes the panel. */
  title: string;
  content: ReactNode;
  /** Second column, shown only while expanded. */
  extraContent?: ReactNode;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onClose: () => void;
}

/** A host-supplied panel: expansion is optional because the host may not offer it. */
export type HostOverlayPanel = Omit<OverlayPanel, "expanded" | "onExpandedChange"> & {
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};
