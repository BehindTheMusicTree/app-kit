"use client";

import type { ReactNode } from "react";
import { z } from "zod";

import { CriteriaOverview } from "@behindthemusictree/app-kit/genre-tree";
import { Scope } from "@behindthemusictree/app-kit/transport";
import { useFetchGenreOverview } from "@behindthemusictree/app-kit/genre-tree";
import { CriteriaPlaylistMinimum } from "@behindthemusictree/app-kit/genre-tree";
import { GenrePlaylistTracks, type GenrePlaylistTracksSlots } from "./GenrePlaylistTracks";
import { RenderArtistLink } from "@behindthemusictree/app-kit/genre-tree";
import { useTrackNoun } from "@behindthemusictree/app-kit/track-noun";

export type GenreDetailSlots<O extends CriteriaOverview> = {
  /** Replaces the default Summary section. */
  renderSummary?: (overview: O) => ReactNode;
  /** Replaces the default Essential section (e.g. "Essential songs"). */
  renderEssentialTracks?: (overview: O) => ReactNode;
};

export type GenreDetailExtrasProps<O extends CriteriaOverview> = GenreDetailSlots<O> & GenrePlaylistTracksSlots & {
  genreUuid: string;
  genrePlaylist: CriteriaPlaylistMinimum;
  scope: Scope;
  getBackendBaseUrl: () => string;
  criteriaOverviewSchema?: z.ZodType<O, z.ZodTypeDef, unknown>;
  renderGenreDetailExtras?: (overview: O) => ReactNode;
  renderArtistLink?: RenderArtistLink;
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
  renderArtistLink,
  renderSummary,
  renderEssentialTracks,
  ...trackSlots
}: GenreDetailExtrasProps<O>) {
  const trackNoun = useTrackNoun();
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
        <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-neutral-200)]" />
      </div>
    );
  }
  if (!overview) return null;

  const { summary, description, summarySourceUrl, essentialTracks } = overview;

  return (
    <>
      {description && <p className="text-sm text-[var(--color-neutral-500)]">{description}</p>}
      {renderSummary ? (
        renderSummary(overview)
      ) : (
        <div className="gtv-info-panel-children">
          <span className="gtv-info-panel-children-title">Summary</span>
          <p>{summary ?? "—"}</p>
        </div>
      )}
      {summarySourceUrl && (
        <a
          href={summarySourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--color-neutral-500)] underline hover:text-[var(--color-neutral-700)]"
        >
          Source: Wikipedia
        </a>
      )}
      {renderGenreDetailExtras?.(overview)}
      {renderEssentialTracks ? (
        renderEssentialTracks(overview)
      ) : (
        essentialTracks && (
        <div className="gtv-info-panel-children">
          <span className="gtv-info-panel-children-title">Essential {trackNoun.plural}</span>
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
        )
      )}
      <GenrePlaylistTracks
        genreUuid={genreUuid}
        genrePlaylist={genrePlaylist}
        scope={scope}
        getBackendBaseUrl={getBackendBaseUrl}
        renderArtistLink={renderArtistLink}
        {...trackSlots}
      />
    </>
  );
}
