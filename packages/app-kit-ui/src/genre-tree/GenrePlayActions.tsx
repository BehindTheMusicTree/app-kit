"use client";

import { Map, Network, Pause, Play } from "lucide-react";
import { ActionButton } from "@behindthemusictree/ui";
import {
  genreMusicCount,
  genreMusicSelectionKey,
  type GenreMusicSelection,
} from "@behindthemusictree/app-kit/genre-tree";
import { usePlayer } from "@behindthemusictree/app-kit/player";

import type { PlayableGenrePlaylist } from "./GenreInfoPanelBody";
import type { GenrePlaylistPlayback } from "./playlist-tree/useGenrePlaylistPlayback";

type PlayIconKind = "play" | "tree" | "map" | "tree-map";
type PlayOption = { key: string; label: string; icon: PlayIconKind; selection?: GenreMusicSelection; count: number };

/** The scope's glyphs (tree = canonical genres, map = regional genres) with the play triangle centered over them. */
function PlayIcon({ kind }: { kind: PlayIconKind }) {
  if (kind === "play") return <Play aria-hidden="true" className="w-5 h-5" />;
  return (
    <span aria-hidden="true" className="relative flex items-center justify-center w-5 h-5">
      {kind === "tree-map" ? (
        <span className="flex items-center justify-center gap-px opacity-60">
          <Network className="w-2.5 h-2.5" />
          <Map className="w-2.5 h-2.5" />
        </span>
      ) : (
        <span className="opacity-60">{kind === "tree" ? <Network className="w-5 h-5" /> : <Map className="w-5 h-5" />}</span>
      )}
      <Play className="absolute w-3 h-3 fill-current stroke-[var(--color-surface-muted)] stroke-[3]" paintOrder="stroke" />
    </span>
  );
}

/** One option per way to scope a genre's playlist; a plain playlist has a single option. */
function playOptions(playlist: PlayableGenrePlaylist): PlayOption[] {
  if (!("genreOnlyTracksCount" in playlist)) return [{ key: "all", label: "Play", icon: "play", count: playlist.tracksCount }];
  const direct: PlayOption = { key: "direct", label: "Genre", icon: "play", selection: { coverage: "genreOnly" }, count: genreMusicCount(playlist, { coverage: "genreOnly" }) };
  const scopes = playlist.genreAndSubgenresTracksCount;
  const inclusive = (label: string, icon: PlayIconKind, subgenres: "canonical" | "regional" | "all"): PlayOption => {
    const selection: GenreMusicSelection = { coverage: "genreAndSubgenres", subgenres };
    return { key: subgenres, label, icon, selection, count: genreMusicCount(playlist, selection) };
  };
  return "canonical" in scopes
    ? [direct, inclusive("Canonical", "tree", "canonical"), inclusive("Regional", "map", "regional"), inclusive("All", "tree-map", "all")]
    : [direct, inclusive("All", "map", "all")];
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
            icon={playing ? <Pause aria-hidden="true" className="w-5 h-5" /> : <PlayIcon kind={option.icon} />}
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
