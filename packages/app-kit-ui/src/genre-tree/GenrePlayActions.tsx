"use client";

import { Pause, Play } from "lucide-react";
import { ActionButton } from "@behindthemusictree/ui";
import {
  genreMusicCount,
  genreMusicSelectionKey,
  type GenreMusicSelection,
} from "@behindthemusictree/app-kit/genre-tree";
import { usePlayer } from "@behindthemusictree/app-kit/player";

import type { PlayableGenrePlaylist } from "./GenreInfoPanelBody";
import type { GenrePlaylistPlayback } from "./playlist-tree/useGenrePlaylistPlayback";

type PlayOption = { key: string; label: string; selection?: GenreMusicSelection; count: number };

/** One option per way to scope a genre's playlist; a plain playlist has a single option. */
function playOptions(playlist: PlayableGenrePlaylist): PlayOption[] {
  if (!("genreOnlyTracksCount" in playlist)) return [{ key: "all", label: "Play", count: playlist.tracksCount }];
  const direct: PlayOption = { key: "direct", label: "Direct", selection: { coverage: "genreOnly" }, count: genreMusicCount(playlist, { coverage: "genreOnly" }) };
  const scopes = playlist.genreAndSubgenresTracksCount;
  const inclusive = (label: string, subgenres: "canonical" | "regional" | "all"): PlayOption => {
    const selection: GenreMusicSelection = { coverage: "genreAndSubgenres", subgenres };
    return { key: subgenres, label, selection, count: genreMusicCount(playlist, selection) };
  };
  return "canonical" in scopes
    ? [direct, inclusive("Canonical", "canonical"), inclusive("Canonical + regional", "all"), inclusive("Regional", "regional")]
    : [direct, inclusive("All", "all")];
}

type GenrePlayActionsProps = {
  genrePlaylist: PlayableGenrePlaylist;
  playback: GenrePlaylistPlayback;
};

/** Play buttons for a genre's playlist, each with the number of playable songs it covers; an empty one stays visible but disabled. */
export default function GenrePlayActions({ genrePlaylist, playback }: GenrePlayActionsProps) {
  const { isPlaying, setIsPlaying } = usePlayer();
  const options = playOptions(genrePlaylist);
  return (
    <>
      {options.map((option) => {
        const isCurrent =
          playback.playing?.uuid === genrePlaylist.uuid &&
          (option.selection === undefined || playback.playing.selectionKey === "" || playback.playing.selectionKey === genreMusicSelectionKey(option.selection).join());
        const playing = isCurrent && isPlaying;
        return (
          <ActionButton
            key={option.key}
            icon={playing ? <Pause aria-hidden="true" className="w-5 h-5" /> : <Play aria-hidden="true" className="w-5 h-5" />}
            label={playing ? "Pause" : option.label}
            caption={String(option.count)}
            disabled={option.count === 0}
            title={option.count === 0 ? "No playable songs" : undefined}
            onClick={() => {
              if (isCurrent) {
                setIsPlaying(!isPlaying);
                return;
              }
              playback.play(genrePlaylist, option.selection).catch((error) => {
                console.error("Failed to load genre playlist tracks:", error);
              });
            }}
          />
        );
      })}
    </>
  );
}
