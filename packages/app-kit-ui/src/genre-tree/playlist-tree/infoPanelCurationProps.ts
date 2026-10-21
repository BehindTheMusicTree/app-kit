import type { GenreTreeProps } from "@behindthemusictree/genre-tree-view";

/** Controlled edit/expand state and edit-mode slots of the info panel, plus the generic overlay panel, as typed by genre-tree-view. */
export type InfoPanelCurationProps = Partial<
  Pick<
    GenreTreeProps,
    | "editMode"
    | "onEditModeChange"
    | "renderTitleEditor"
    | "renderParentsEditor"
    | "renderDangerZone"
    | "expanded"
    | "onExpandedChange"
    | "overlayPanel"
  >
>;
