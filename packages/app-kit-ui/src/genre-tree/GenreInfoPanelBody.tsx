"use client";

import type { ComponentProps, ReactNode } from "react";

import {
  type CriteriaOverview,
  type CriteriaPlaylistMinimum,
  type GenreUuid,
} from "@behindthemusictree/app-kit/genre-tree";
import { usePlayer } from "@behindthemusictree/app-kit/player";
import type { Scope } from "@behindthemusictree/app-kit/transport";

import GenreActionBand from "./GenreActionBand";
import { GenreDetailExtras, type GenreDetailExtrasProps } from "./GenreDetailExtras";
import type { GenrePlaylistPlayback } from "./playlist-tree/useGenrePlaylistPlayback";

/** What the action band reads of a genre's playlist: enough to play it and to know whether it can be. */
export type PlayableGenrePlaylist = CriteriaPlaylistMinimum & { tracksCount: number };

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
      onPlayPause={genrePlaylist.tracksCount > 0 ? handlePlayPause : undefined}
      isPlaying={isCurrentTrackList && isPlaying}
    />
  );
}

export type GenreInfoPanelBodyProps<O extends CriteriaOverview> = {
  /** genre-tree-view's toolbar section, rendered first. */
  toolbar?: ReactNode;
  family: ReactNode;
  genreUuid: GenreUuid;
  genrePlaylist: PlayableGenrePlaylist;
  wikidataId?: string | null;
  scope: Scope;
  getBackendBaseUrl: () => string;
  playback: GenrePlaylistPlayback;
  /** Action band props other than play, which the body derives from `playback`. */
  band: Omit<GenreNodeActionBandProps, "genrePlaylist" | "playback">;
  extras?: Omit<
    GenreDetailExtrasProps<O>,
    "family" | "genreUuid" | "genrePlaylist" | "wikidataId" | "scope" | "getBackendBaseUrl"
  >;
};

/** The body of a genre's info panel: action band, then the genre's overview, family and tracks.
 * Shared by the tree's panel and the standalone GenreDetailPanel. */
export function GenreInfoPanelBody<O extends CriteriaOverview>({
  toolbar,
  family,
  genreUuid,
  genrePlaylist,
  wikidataId,
  scope,
  getBackendBaseUrl,
  playback,
  band,
  extras,
}: GenreInfoPanelBodyProps<O>) {
  return (
    <>
      {toolbar}
      <GenreNodeActionBand {...band} genrePlaylist={genrePlaylist} playback={playback} />
      <GenreDetailExtras<O>
        {...extras}
        key={genreUuid}
        family={family}
        genreUuid={genreUuid}
        genrePlaylist={genrePlaylist}
        wikidataId={wikidataId}
        scope={scope}
        getBackendBaseUrl={getBackendBaseUrl}
      />
    </>
  );
}
