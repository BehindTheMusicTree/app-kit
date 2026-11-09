import type { Scope } from "@behindthemusictree/app-kit/transport";
import type { GenreUuid } from "@behindthemusictree/app-kit/genre-tree";

/** Identifies the detail-panel entity whose current host route should be shared. */
export type GenreTreeShareTarget =
  | {
      kind: "genre";
      /** Genre entity identity, independent of its playlist or renderer. */
      genreUuid: GenreUuid;
      name: string;
      scope: Scope;
      /** Preserve an active artist filter when sharing one of its genre details. */
      artistUuid: string | null;
    }
  | {
      kind: "artist";
      uuid: string;
      name: string;
      scope: Scope;
    }
  | {
      kind: "song";
      uuid: string;
      /** The song title. */
      name: string;
      scope: Scope;
    };

/** Host applications own routing and return an absolute or relative URL for this target. */
export type GetGenreTreeShareUrl = (target: GenreTreeShareTarget) => string | null | undefined;
