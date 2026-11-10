"use client";

import type { ReactNode } from "react";
import { ArrowLeftRight, MoveUpRight, Pencil, Plus, ZoomIn } from "lucide-react";
import { ActionBand, ActionButton } from "@behindthemusictree/ui";
import type {
  GenreTreeAction,
  GenreTreeNode,
} from "@behindthemusictree/genre-tree-view";
import type { GenreTreeShareTarget } from "./share";
import ShareActionButton from "./ShareActionButton";

export type GenreActionBandProps = {
  node: GenreTreeNode;
  /** Play buttons, shown first. */
  playActions?: ReactNode;
  /** When set, shows the "Zoom in" action. */
  onZoomIn?: () => void;
  /** When set, shows the "Add" (sub-genre) action. */
  onAddChild?: () => void;
  /** When set, shows the "Rename" action. */
  onRename?: () => void;
  /** When set, shows the "Parent" (change parent) action. */
  onChangeParent?: () => void;
  side?: "core" | "pop";
  /** When set, shows the "Make pop" / "Make core" action. */
  onToggleSide?: () => void;
  /** When set, disables the side toggle and explains why in its tooltip. */
  toggleSideDisabledReason?: string;
  additionalActions?: (node: GenreTreeNode) => GenreTreeAction[];
  shareTarget?: GenreTreeShareTarget;
  shareUrl?: string;
};

type BandItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: (event: React.MouseEvent) => void;
  disabled?: boolean;
  title?: string;
};

export default function GenreActionBand({
  node,
  playActions,
  onZoomIn,
  onAddChild,
  onRename,
  onChangeParent,
  side,
  onToggleSide,
  toggleSideDisabledReason,
  additionalActions,
  shareTarget,
  shareUrl,
}: GenreActionBandProps) {
  const items: BandItem[] = [];
  const adminItems: BandItem[] = [];
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
  if (onToggleSide) {
    adminItems.push({
      key: "toggle-side",
      label: side === "pop" ? "Make core" : "Make pop",
      icon: <ArrowLeftRight aria-hidden="true" className="w-5 h-5" />,
      onClick: onToggleSide,
      disabled: !!toggleSideDisabledReason,
      title: toggleSideDisabledReason,
    });
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
  const renderItems = (list: BandItem[]) =>
    list.map((item) => (
      <ActionButton key={item.key} icon={item.icon} label={item.label} disabled={item.disabled} title={item.title} onClick={item.onClick} />
    ));

  return (
    <ActionBand
      className="genre-action-band"
      section={{ title: "Admin", label: "Admin actions", children: renderItems(adminItems) }}
    >
      {playActions}
      {renderItems(items)}
      {shareTarget && shareUrl && <ShareActionButton target={shareTarget} url={shareUrl} />}
    </ActionBand>
  );
}
