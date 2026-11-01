"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { twMerge } from "tailwind-merge";

export type PanelEdgeTabAction = {
  label: string;
  onClick: () => void;
  /** Reflected as `aria-expanded` on the button; omit when the button is not a disclosure. */
  expanded?: boolean;
};

export interface PanelEdgeTabProps {
  /** Side of the screen the panel sits on; the tab hangs off the panel's inner edge. */
  side: "left" | "right";
  /** Button whose chevron points toward the screen edge. */
  edge: PanelEdgeTabAction | null;
  /** Button whose chevron points toward the center of the screen. */
  center: PanelEdgeTabAction | null;
  /** Id of the panel the buttons control, when the host can name it. */
  controls?: string;
  className?: string;
}

const buttonClassName =
  "flex h-12 w-full items-center justify-center p-0 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-primary)]";

export default function PanelEdgeTab({ side, edge, center, controls, className }: PanelEdgeTabProps) {
  if (!edge && !center) return null;
  const isLeft = side === "left";
  const EdgeIcon = isLeft ? ChevronLeft : ChevronRight;
  const CenterIcon = isLeft ? ChevronRight : ChevronLeft;

  const renderButton = (action: PanelEdgeTabAction, icon: ReactNode) => (
    <button
      type="button"
      aria-label={action.label}
      title={action.label}
      aria-controls={controls}
      aria-expanded={action.expanded}
      className={buttonClassName}
      onClick={action.onClick}
    >
      {icon}
    </button>
  );

  const edgeButton = edge && renderButton(edge, <EdgeIcon aria-hidden="true" className="h-5 w-5" />);
  const centerButton = center && renderButton(center, <CenterIcon aria-hidden="true" className="h-5 w-5" />);
  const buttons = isLeft ? [edgeButton, centerButton] : [centerButton, edgeButton];

  return (
    <div
      className={twMerge(
        "panel-edge-tab flex w-[var(--layout-edge-tab-w)] flex-col overflow-hidden bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)] [clip-path:inset(-0.5rem_-0.5rem_-0.5rem_0)]",
        isLeft ? "rounded-r-lg" : "rounded-l-lg [clip-path:inset(-0.5rem_0_-0.5rem_-0.5rem)]",
        className,
      )}
    >
      {buttons[0]}
      {buttons[0] && buttons[1] && <div role="presentation" className="h-px shrink-0 bg-[var(--color-border)]" />}
      {buttons[1]}
    </div>
  );
}
