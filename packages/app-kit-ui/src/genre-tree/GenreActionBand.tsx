"use client";

import type { ReactNode } from "react";
import { MoveUpRight, Pause, Pencil, Play, Plus, ZoomIn } from "lucide-react";
import type {
  GenreTreeAction,
  GenreTreeNode,
} from "@behindthemusictree/genre-tree-view";

export type GenreActionBandProps = {
  node: GenreTreeNode;
  /** When set, shows the Play/Pause action. */
  onPlayPause?: () => void;
  isPlaying?: boolean;
  /** When set, shows the "Zoom in" action. */
  onZoomIn?: () => void;
  /** When set, shows the "Add" (sub-genre) action. */
  onAddChild?: () => void;
  /** When set, shows the "Rename" action. */
  onRename?: () => void;
  /** When set, shows the "Parent" (change parent) action. */
  onChangeParent?: () => void;
  additionalActions?: (node: GenreTreeNode) => GenreTreeAction[];
};

type BandItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: (event: React.MouseEvent) => void;
  disabled?: boolean;
};

export default function GenreActionBand({
  node,
  onPlayPause,
  isPlaying = false,
  onZoomIn,
  onAddChild,
  onRename,
  onChangeParent,
  additionalActions,
}: GenreActionBandProps) {
  const items: BandItem[] = [];
  const adminItems: BandItem[] = [];
  if (onPlayPause) {
    items.push({
      key: "play-pause",
      label: isPlaying ? "Pause" : "Play",
      icon: isPlaying ? (
        <Pause aria-hidden="true" className="w-5 h-5" />
      ) : (
        <Play aria-hidden="true" className="w-5 h-5" />
      ),
      onClick: onPlayPause,
    });
  }
  if (onZoomIn) {
    items.push({
      key: "zoom-in",
      label: "Focus",
      icon: <ZoomIn aria-hidden="true" className="w-5 h-5" />,
      onClick: onZoomIn,
    });
  }
  if (onAddChild) {
    adminItems.push({ key: "add-child", label: "Add", icon: <Plus aria-hidden="true" className="w-5 h-5" />, onClick: onAddChild });
  }
  if (onRename) {
    adminItems.push({ key: "rename", label: "Rename", icon: <Pencil aria-hidden="true" className="w-5 h-5" />, onClick: onRename });
  }
  if (onChangeParent) {
    adminItems.push({ key: "change-parent", label: "Parent", icon: <MoveUpRight aria-hidden="true" className="w-5 h-5" />, onClick: onChangeParent });
  }
  for (const action of additionalActions?.(node) ?? []) {
    items.push({
      key: action.key,
      label: action.label(node),
      icon: action.icon(node),
      onClick: (event) => action.onClick(event, node),
      disabled: action.enabled ? !action.enabled(node) : false,
    });
  }
  if (items.length === 0 && adminItems.length === 0) return null;

  const renderItems = (list: BandItem[]) =>
    list.map((item) => (
      <button
        key={item.key}
        type="button"
        disabled={item.disabled}
        onClick={item.onClick}
        className="group flex flex-col items-center gap-1 w-16 text-xs text-center text-[var(--color-text)] focus-visible:outline-none disabled:opacity-50"
      >
        <span className="flex items-center justify-center w-10 h-10 rounded-full group-focus-visible:ring-2 group-focus-visible:ring-[var(--color-focus-ring)] bg-[var(--color-surface-muted)] transition-colors group-hover:bg-[var(--color-border)] group-disabled:group-hover:bg-[var(--color-surface-muted)]">
          {item.icon}
        </span>
        {item.label}
      </button>
    ));

  return (
    <div className="genre-action-band border-b border-[var(--color-border)]">
      {items.length > 0 && <div className="flex flex-wrap gap-1 px-3.5 py-3">{renderItems(items)}</div>}
      {adminItems.length > 0 && (
        <section
          aria-label="Admin actions"
          className={`px-3.5 py-3 ${items.length > 0 ? "border-t border-[var(--color-border)]" : ""}`}
        >
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Admin</h3>
          <div className="flex flex-wrap gap-1">{renderItems(adminItems)}</div>
        </section>
      )}
    </div>
  );
}
