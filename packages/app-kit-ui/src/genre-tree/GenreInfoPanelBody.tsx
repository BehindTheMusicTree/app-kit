"use client";

import type { ComponentProps, ReactNode } from "react";

import {
  genreMusicCount,
  defaultGenreMusicSelection,
  GenreCatalogueCountsSchema,
  type GenreCatalogueCounts,
  type GenrePlaylistSummary,
  type CriteriaOverview,
  type CriteriaMinimum,
  type CriteriaPlaylistMinimum,
  type GenreUuid,
} from "@behindthemusictree/app-kit/genre-tree";
import { useTrackNoun } from "@behindthemusictree/app-kit/track-noun";
import { usePlayer } from "@behindthemusictree/app-kit/player";
import type { Scope } from "@behindthemusictree/app-kit/transport";

import GenreActionBand from "./GenreActionBand";
import { GenreDetailExtras, type GenreDetailExtrasProps } from "./GenreDetailExtras";
import type { GenrePlaylistPlayback } from "./playlist-tree/useGenrePlaylistPlayback";

/** What the action band reads of a genre's playlist: enough to play it and to know whether it can be. */
export type PlayableGenrePlaylist = ((CriteriaPlaylistMinimum & { tracksCount: number }) | GenrePlaylistSummary) & { criteria?: CriteriaMinimum | null };

type GenreNodeActionBandProps = Omit<ComponentProps<typeof GenreActionBand>, "onPlayPause" | "isPlaying"> & {
  genrePlaylist: PlayableGenrePlaylist;
  playback: GenrePlaylistPlayback;
};

export function GenreNodeActionBand({ genrePlaylist, playback, ...bandProps }: GenreNodeActionBandProps) {
  const { isPlaying, setIsPlaying } = usePlayer();
  const isCurrentTrackList = playback.playingNodeId === genrePlaylist.uuid;
  const handlePlayPause = () => {
    if (isCurrentTrackList) {
      setIsPlaying(!isPlaying);
      return;
    }
    playback.play(genrePlaylist).catch((error) => {
      console.error("Failed to load genre playlist tracks:", error);
    });
  };
  return (
    <GenreActionBand
      {...bandProps}
      onPlayPause={("genreOnlyTracksCount" in genrePlaylist ? genreMusicCount(genrePlaylist) : genrePlaylist.tracksCount) > 0 ? handlePlayPause : undefined}
      isPlaying={isCurrentTrackList && isPlaying}
    />
  );
}

export type GenreInfoPanelBodyProps<O extends CriteriaOverview> = {
  /** genre-tree-view's toolbar section, rendered first. */
  toolbar?: ReactNode;
  family: ReactNode;
  genreUuid: GenreUuid;
  catalogue?: GenreCatalogueCounts;
  countsContext?: string;
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
  countsContext,
  wikidataId,
  scope,
  getBackendBaseUrl,
  playback,
  band,
  extras,
}: GenreInfoPanelBodyProps<O>) {
  const noun = useTrackNoun();
  const summary = scope === "reference" ? GenreCatalogueCountsSchema.parse(genrePlaylist ?? catalogue) : undefined;
  const selection = summary ? defaultGenreMusicSelection(summary) : undefined;
  const describeCounts = (counts: GenreCatalogueCounts) => {
    const scopes = counts.genreAndSubgenresTracksCount;
    return "canonical" in scopes
      ? `${counts.genreOnlyTracksCount} this genre only · ${scopes.canonical} with canonical subgenres · ${scopes.regional} with regional subgenres · ${scopes.all} with all subgenres`
      : `${counts.genreOnlyTracksCount} this genre only · ${scopes.all} with subgenres`;
  };
  return (
    <>
      {toolbar}
      {genrePlaylist ? <GenreNodeActionBand {...band} genrePlaylist={genrePlaylist} playback={playback} /> : <GenreActionBand {...band} />}
      {summary && catalogue && (
        <div className="px-3.5 py-3 text-body text-[var(--color-text)]">
          <p>Catalogue {noun.plural}{countsContext ? ` (${countsContext})` : ""}: {describeCounts(catalogue)}</p>
          {genrePlaylist && <p>Playlist {noun.plural}{countsContext ? ` (${countsContext})` : ""}: {describeCounts(summary)}</p>}
        </div>
      )}
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
