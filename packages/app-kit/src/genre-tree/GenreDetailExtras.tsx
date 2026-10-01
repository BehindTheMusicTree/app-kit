"use client";

import type { ReactNode } from "react";
import { z } from "zod";

import { CriteriaOverview } from "./schemas/criteria/overview";
import { Scope } from "../transport/lib/scope";
import { useFetchGenreOverview } from "./useGenre";
import { CriteriaPlaylistMinimum } from "./schemas/criteria-playlist/minimum";
import { GenrePlaylistTracks } from "./GenrePlaylistTracks";

export type GenreDetailExtrasProps<O extends CriteriaOverview> = {
  genreUuid: string;
  genrePlaylist: CriteriaPlaylistMinimum;
  scope: Scope;
  getBackendBaseUrl: () => string;
  criteriaOverviewSchema?: z.ZodType<O, z.ZodTypeDef, unknown>;
  renderGenreDetailExtras?: (overview: O) => ReactNode;
};

// Owns the overview fetch so its pending → success transitions re-render only the info panel,
// not the tree that renders it.
export function GenreDetailExtras<O extends CriteriaOverview>({
  genreUuid,
  genrePlaylist,
  scope,
  getBackendBaseUrl,
  criteriaOverviewSchema,
  renderGenreDetailExtras,
}: GenreDetailExtrasProps<O>) {
  const { data: overview, isPending } = useFetchGenreOverview<O>(
    genreUuid,
    scope,
    getBackendBaseUrl,
    criteriaOverviewSchema,
  );

  if (isPending) {
    return (
      <div className="gtv-info-panel-children" aria-busy="true" data-testid="genre-detail-extras-skeleton">
        <span className="gtv-info-panel-children-title">Summary</span>
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }
  if (!overview) return null;

  const { summary, essentialTracks } = overview;

  return (
    <>
      <div className="gtv-info-panel-children">
        <span className="gtv-info-panel-children-title">Summary</span>
        <p>{summary ?? "—"}</p>
      </div>
      {renderGenreDetailExtras?.(overview)}
      {essentialTracks && (
        <div className="gtv-info-panel-children">
          <span className="gtv-info-panel-children-title">Essential tracks</span>
          {essentialTracks.length > 0 ? (
            <ul className="list-disc pl-5">
              {essentialTracks.map((track) => (
                <li key={track.uuid}>{track.title}</li>
              ))}
            </ul>
          ) : (
            <p>—</p>
          )}
        </div>
      )}
      <GenrePlaylistTracks genrePlaylist={genrePlaylist} scope={scope} getBackendBaseUrl={getBackendBaseUrl} />
    </>
  );
}
