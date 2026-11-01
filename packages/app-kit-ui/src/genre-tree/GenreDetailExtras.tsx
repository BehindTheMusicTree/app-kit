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
import { SiWikidata, SiWikipedia } from "react-icons/si";

export type GenreDetailSlots<O extends CriteriaOverview> = {
  /** Replaces the default Summary section. */
  renderSummary?: (overview: O) => ReactNode;
  /** Replaces the default Essential section (e.g. "Essential songs"). */
  renderEssentialTracks?: (overview: O) => ReactNode;
};

export type GenreDetailExtrasProps<O extends CriteriaOverview> = GenreDetailSlots<O> & GenrePlaylistTracksSlots & {
  genreUuid: GenreUuid;
  genrePlaylist: CriteriaPlaylistMinimum;
  wikidataId?: string | null;
  scope: Scope;
  getBackendBaseUrl: () => string;
  criteriaOverviewSchema?: z.ZodType<O, unknown>;
  renderGenreDetailExtras?: (overview: O) => ReactNode;
  renderArtistLink?: RenderArtistLink;
  /** When set, the tracks list shows only this artist's songs in the genre. */
  artist?: { uuid: string; name: string } | null;
  /** genre-tree-view's Family section, placed right after the Summary. */
  family: ReactNode;
};

// Owns the overview fetch so its pending → success transitions re-render only the info panel,
// not the tree that renders it.
export function GenreDetailExtras<O extends CriteriaOverview>({
  genreUuid,
  genrePlaylist,
  wikidataId,
  scope,
  getBackendBaseUrl,
  criteriaOverviewSchema,
  renderGenreDetailExtras,
  renderArtistLink,
  renderSummary,
  renderEssentialTracks,
  family,
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
      <>
        <div className="gtv-info-panel-children" aria-busy="true" data-testid="genre-detail-extras-skeleton">
          <span className="gtv-info-panel-children-title">Summary</span>
          <Skeleton className="h-4 w-3/4" />
        </div>
        {family}
      </>
    );
  }
  if (!overview) return <>{family}</>;

  const { summary, summarySourceUrl, essentialSongs } = overview;
  const wikidataUrl = wikidataId ? `https://www.wikidata.org/wiki/${encodeURIComponent(wikidataId)}` : null;

  return (
    <>
      {(summarySourceUrl || wikidataUrl) && (
        <div className="gtv-info-panel-children text-[0.8125rem] leading-[1.45] text-[var(--color-text)]">
          <span className="gtv-info-panel-children-title">Links</span>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {summarySourceUrl && (
              <a
                href={summarySourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <SiWikipedia aria-hidden="true" className="h-3.5 w-3.5" />
                Wikipedia
              </a>
            )}
            {wikidataUrl && (
              <a
                href={wikidataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <SiWikidata aria-hidden="true" className="h-3.5 w-3.5" />
                Wikidata
              </a>
            )}
          </div>
        </div>
      )}
      {renderSummary ? (
        renderSummary(overview)
      ) : (
        <div className="gtv-info-panel-children text-[0.8125rem] leading-[1.45] text-[var(--color-text)]">
          <span className="gtv-info-panel-children-title">Summary</span>
          <ClampedText key={genreUuid} className="mt-1">{summary ?? "—"}</ClampedText>
        </div>
      )}
      {family}
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
