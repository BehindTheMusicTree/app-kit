"use client";

import { Pause, Play } from "lucide-react";
import { ActionBand, ActionButton } from "@behindthemusictree/ui";
import { TrackListOriginType, useTrackList, type ArtistDetailed, type SongDetailed } from "@behindthemusictree/app-kit/genre-tree";
import { usePlayer } from "@behindthemusictree/app-kit/player";
import type { ReactNode } from "react";

type ArtistActionBandProps = {
  artist: Pick<ArtistDetailed, "uuid" | "name" | "playableTracksCount">;
  /** Share button, when the host provides a share URL. */
  share?: ReactNode;
};

/** The artist panel's action band: Play over the artist's playable songs, with their count. */
export default function ArtistActionBand({ artist, share }: ArtistActionBandProps) {
  const { trackList, playNewTrackListFromArtist } = useTrackList<SongDetailed>();
  const { isPlaying, setIsPlaying } = usePlayer();
  const origin = trackList?.origin;
  const isCurrent = origin?.type === TrackListOriginType.ARTIST && origin.uuid === artist.uuid;
  const playing = isCurrent && isPlaying;
  const handleClick = () => {
    if (isCurrent) {
      setIsPlaying(!isPlaying);
      return;
    }
    playNewTrackListFromArtist({ uuid: artist.uuid, name: artist.name }, "reference", { ordering: "title" }).catch((error) => {
      console.error("Failed to load artist tracks:", error);
    });
  };
  return (
    <ActionBand>
      <ActionButton
        icon={playing ? <Pause aria-hidden="true" className="w-5 h-5" /> : <Play aria-hidden="true" className="w-5 h-5" />}
        label={playing ? "Pause" : "Play"}
        caption={String(artist.playableTracksCount)}
        disabled={artist.playableTracksCount === 0}
        title={artist.playableTracksCount === 0 ? "No playable songs" : undefined}
        onClick={handleClick}
      />
      {share}
    </ActionBand>
  );
}
