"use client";

import type { ReactNode } from "react";
import { PanelSection, Skeleton } from "@behindthemusictree/ui";
import { z } from "zod";

import type { GenreMusicSelection } from "@behindthemusictree/app-kit/genre-tree";
import { CriteriaOverview } from "@behindthemusictree/app-kit/genre-tree";
import { Scope } from "@behindthemusictree/app-kit/transport";
import { useFetchGenreOverview } from "@behindthemusictree/app-kit/genre-tree";
import { CriteriaPlaylistMinimum, type GenreUuid } from "@behindthemusictree/app-kit/genre-tree";
import { ClampedText } from "./ClampedText";
import { GenrePlaylistTracks, type GenrePlaylistTracksSlots } from "./GenrePlaylistTracks";
import type { RenderSongLink } from "@behindthemusictree/app-kit/genre-tree";
import { RenderArtistLink } from "@behindthemusictree/app-kit/genre-tree";
import { useTrackNoun } from "@behindthemusictree/app-kit/track-noun";
import { SiWikidata, SiWikipedia } from "react-icons/si";

export type GenreDetailSlots<O extends CriteriaOverview> = {
  /** Replaces the body of the default Summary section; the title and frame stay. */
  renderSummary?: (overview: O) => ReactNode;
  /** Replaces the body of the default Essential section (e.g. "Essential songs"); the title and frame stay. */
  renderEssentialTracks?: (overview: O) => ReactNode;
};

export type GenreDetailExtrasProps<O extends CriteriaOverview> = GenreDetailSlots<O> & GenrePlaylistTracksSlots & {
  genreUuid: GenreUuid;
  genrePlaylist: CriteriaPlaylistMinimum | null;
  genreName?: string;
  selection?: GenreMusicSelection;
  wikidataId?: string | null;
  scope: Scope;
  getBackendBaseUrl: () => string;
  criteriaOverviewSchema?: z.ZodType<O, unknown>;
  renderGenreDetailExtras?: (overview: O) => ReactNode;
  renderArtistLink?: RenderArtistLink;
  renderSongLink?: RenderSongLink;
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
  genreName,
  selection,
  wikidataId,
  scope,
  getBackendBaseUrl,
  criteriaOverviewSchema,
  renderGenreDetailExtras,
  renderArtistLink,
  renderSongLink,
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
        <PanelSection title="Summary">
          <div aria-busy="true" data-testid="genre-detail-extras-skeleton">
            <Skeleton className="h-4 w-3/4" />
          </div>
        </PanelSection>
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
        <PanelSection title="Links">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-[var(--color-text)]">
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
        </PanelSection>
      )}
      <PanelSection title="Summary">
        {renderSummary ? (
          renderSummary(overview)
        ) : (
          <ClampedText key={genreUuid} className="text-body text-[var(--color-text)]">
            {summary ?? "—"}
          </ClampedText>
        )}
      </PanelSection>
      {family}
      {renderGenreDetailExtras?.(overview)}
      {(renderEssentialTracks || essentialSongs) && (
        <PanelSection title={`Essential ${trackNoun.plural}`}>
          {renderEssentialTracks ? (
            renderEssentialTracks(overview)
          ) : essentialSongs && essentialSongs.length > 0 ? (
            <ul className="text-body text-[var(--color-text)]">
              {essentialSongs.map((track) => (
                <li key={track.uuid} className="py-1">
                  {track.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-[var(--color-text)]">—</p>
          )}
        </PanelSection>
      )}
      <GenrePlaylistTracks
        genreUuid={genreUuid}
        genrePlaylist={genrePlaylist}
        genreName={genreName}
        selection={selection}
        scope={scope}
        getBackendBaseUrl={getBackendBaseUrl}
        renderArtistLink={renderArtistLink}
        renderSongLink={renderSongLink}
        {...trackSlots}
      />
    </>
  );
}
