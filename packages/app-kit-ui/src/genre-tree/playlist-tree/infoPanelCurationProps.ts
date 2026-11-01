import type { GenreTreeProps } from "@behindthemusictree/genre-tree-view";

/** Controlled expand state and danger-zone slot of the info panel, plus the generic overlay panel, as typed by genre-tree-view. */
export type InfoPanelCurationProps = Partial<
  Pick<
    GenreTreeProps,
    | "renderDangerZone"
    | "expanded"
    | "onExpandedChange"
    | "collapsed"
    | "hideExpandButton"
    | "overlayPanel"
  >
>;
