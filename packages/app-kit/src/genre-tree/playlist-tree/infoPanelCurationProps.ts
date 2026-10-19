import type { ReactNode } from "react";
import type { GenreTreeNode } from "@behindthemusictree/genre-tree-view";

/** Controlled edit/expand state and edit-mode slots of the info panel; see genre-tree-view's `GenreTreeProps`. */
export type InfoPanelCurationProps = {
  editMode?: boolean;
  onEditModeChange?: (on: boolean) => void;
  renderTitleEditor?: (node: GenreTreeNode) => ReactNode;
  renderParentsEditor?: (node: GenreTreeNode) => ReactNode;
  renderDangerZone?: (node: GenreTreeNode) => ReactNode;
  expanded?: boolean;
  onExpandedChange?: (on: boolean) => void;
};
