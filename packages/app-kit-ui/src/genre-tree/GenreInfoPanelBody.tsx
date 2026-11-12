"use client";

import type { ComponentProps, ReactNode } from "react";

import {
  defaultGenreMusicSelection,
  GenreCatalogueCountsSchema,
  type GenreCatalogueCounts,
  type GenrePlaylistSummary,
  type CriteriaOverview,
  type CriteriaMinimum,
  type CriteriaPlaylistMinimum,
  type GenreUuid,
} from "@behindthemusictree/app-kit/genre-tree";
import type { Scope } from "@behindthemusictree/app-kit/transport";

import GenreActionBand from "./GenreActionBand";
import GenrePlayActions from "./GenrePlayActions";
import { GenreDetailExtras, type GenreDetailExtrasProps } from "./GenreDetailExtras";
import type { GenrePlaylistPlayback } from "./playlist-tree/useGenrePlaylistPlayback";

/** What the action band reads of a genre's playlist: enough to play it and to know whether it can be. */
export type PlayableGenrePlaylist = ((CriteriaPlaylistMinimum & { tracksCount: number }) | GenrePlaylistSummary) & { criteria?: CriteriaMinimum | null };

type GenreNodeActionBandProps = Omit<ComponentProps<typeof GenreActionBand>, "playActions"> & {
  genrePlaylist: PlayableGenrePlaylist;
  playback: GenrePlaylistPlayback;
};

export function GenreNodeActionBand({ genrePlaylist, playback, ...bandProps }: GenreNodeActionBandProps) {
  return <GenreActionBand {...bandProps} playActions={<GenrePlayActions genrePlaylist={genrePlaylist} playback={playback} />} />;
}

export type GenreInfoPanelBodyProps<O extends CriteriaOverview> = {
  /** genre-tree-view's toolbar section, rendered first. */
  toolbar?: ReactNode;
  family: ReactNode;
  genreUuid: GenreUuid;
  catalogue?: GenreCatalogueCounts;
  genrePlaylist: PlayableGenrePlaylist | null;
  wikidataId?: string | null;
  scope: Scope;
  getBackendBaseUrl: () => string;
  playback: GenrePlaylistPlayback;
  /** Action band props other than play, which the body derives from `playback`. */
  band: Omit<GenreNodeActionBandProps, "genrePlaylist" | "playback">;
  extras?: Omit<
    GenreDetailExtrasProps<O>,
    "family" | "genreUuid" | "genreName" | "genrePlaylist" | "wikidataId" | "scope" | "getBackendBaseUrl"
  >;
};

/** The body of a genre's info panel: action band, then the genre's overview, family and tracks.
 * Shared by the tree's panel and the standalone GenreDetailPanel. */
export function GenreInfoPanelBody<O extends CriteriaOverview>({
  toolbar,
  family,
  genreUuid,
  genrePlaylist,
  catalogue,
  wikidataId,
  scope,
  getBackendBaseUrl,
  playback,
  band,
  extras,
}: GenreInfoPanelBodyProps<O>) {
  const summary = scope === "reference" ? GenreCatalogueCountsSchema.parse(genrePlaylist ?? catalogue) : undefined;
  const selection = summary ? defaultGenreMusicSelection(summary) : undefined;
  return (
    <>
      {toolbar}
      {genrePlaylist ? <GenreNodeActionBand {...band} genrePlaylist={genrePlaylist} playback={playback} /> : <GenreActionBand {...band} />}
      <GenreDetailExtras<O>
        {...extras}
        key={genreUuid}
        family={family}
        genreUuid={genreUuid}
        genrePlaylist={genrePlaylist}
        genreName={band.node.name}
        selection={selection}
        wikidataId={wikidataId}
        scope={scope}
        getBackendBaseUrl={getBackendBaseUrl}
      />
    </>
  );
}
