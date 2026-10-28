"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@behindthemusictree/ui";
import { z } from "zod";

import { CriteriaOverview } from "@behindthemusictree/app-kit/genre-tree";
import { Scope } from "@behindthemusictree/app-kit/transport";
import { useFetchGenreOverview } from "@behindthemusictree/app-kit/genre-tree";
import { CriteriaPlaylistMinimum, type GenreUuid } from "@behindthemusictree/app-kit/genre-tree";
import { ClampedText } from "./ClampedText";
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
  genreUuid: GenreUuid;
  genrePlaylist: CriteriaPlaylistMinimum;
  scope: Scope;
  getBackendBaseUrl: () => string;
  criteriaOverviewSchema?: z.ZodType<O, z.ZodTypeDef, unknown>;
  renderGenreDetailExtras?: (overview: O) => ReactNode;
  renderArtistLink?: RenderArtistLink;
  /** When set, the tracks list shows only this artist's songs in the genre. */
  artist?: { uuid: string; name: string } | null;
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
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }
  if (!overview) return null;

  const { summary, description, summarySourceUrl, essentialSongs } = overview;

  return (
    <>
      {description && (
        <div className="px-3.5 py-2.5">
          <ClampedText key={genreUuid} className="text-[0.8125rem] leading-[1.45] text-[var(--color-text-muted)]">{description}</ClampedText>
        </div>
      )}
      {renderSummary ? (
        renderSummary(overview)
      ) : (
        <div className="gtv-info-panel-children text-[0.8125rem] leading-[1.45] text-[var(--color-text)]">
          <span className="gtv-info-panel-children-title">Summary</span>
          <ClampedText key={genreUuid} className="mt-1">{summary ?? "—"}</ClampedText>
          {summarySourceUrl && (
            <a
              href={summarySourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-[var(--color-text-muted)] underline hover:text-[var(--color-text)]"
            >
              Source: Wikipedia
            </a>
          )}
        </div>
      )}
      {renderSummary && summarySourceUrl && (
        <a
          href={summarySourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-3.5 mb-2.5 inline-block text-xs text-[var(--color-text-muted)] underline hover:text-[var(--color-text)]"
        >
          Source: Wikipedia
        </a>
      )}
      {renderGenreDetailExtras?.(overview)}
      {renderEssentialTracks ? (
        renderEssentialTracks(overview)
      ) : (
        essentialSongs && (
        <div className="gtv-info-panel-children text-[0.8125rem] leading-[1.45] text-[var(--color-text)]">
          <span className="gtv-info-panel-children-title">Essential {trackNoun.plural}</span>
          {essentialSongs.length > 0 ? (
            <ul className="mt-1 divide-y divide-[var(--color-border)]">
              {essentialSongs.map((track) => (
                <li key={track.uuid} className="py-1">
                  {track.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1">—</p>
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
