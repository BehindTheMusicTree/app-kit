import type { ReactNode } from "react";

/** An artist or song detail the host renders in the shared DetailPanel in place of a genre's. */
export interface OverlayPanel {
  title: ReactNode;
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
