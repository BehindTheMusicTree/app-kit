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
    items.push({ key: "add-child", label: "Add", icon: <Plus aria-hidden="true" className="w-5 h-5" />, onClick: onAddChild });
  }
  if (onRename) {
    items.push({ key: "rename", label: "Rename", icon: <Pencil aria-hidden="true" className="w-5 h-5" />, onClick: onRename });
  }
  if (onChangeParent) {
    items.push({ key: "change-parent", label: "Parent", icon: <MoveUpRight aria-hidden="true" className="w-5 h-5" />, onClick: onChangeParent });
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
  if (items.length === 0) return null;

  return (
    <div className="genre-action-band flex gap-1 px-2 py-3 overflow-x-auto border-b border-[var(--color-neutral-200)]">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          disabled={item.disabled}
          onClick={item.onClick}
          className="group flex flex-col items-center gap-1 w-16 shrink-0 text-xs text-center text-[var(--color-text)] bg-transparent disabled:opacity-50"
        >
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-neutral-100)] transition-colors group-hover:bg-[var(--color-neutral-200)] group-disabled:group-hover:bg-[var(--color-neutral-100)]">
            {item.icon}
          </span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
