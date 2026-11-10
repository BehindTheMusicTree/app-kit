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
import { RegionGlobeIcon } from "./RegionGlobeIcon";
import { TreeMarkIcon } from "./TreeMarkIcon";

type PlayIconKind = "play" | "tree" | "map" | "tree-map";
type PlayOption = { key: string; label: string; icon: PlayIconKind; selection?: GenreMusicSelection; count: number };

/** The play triangle is the same on every button; the scope's glyphs (tree = canonical genres, map = regional genres) stay faint behind it so it reads first. "All" joins the left half of the tree and the right half of the globe at the centre. */
function PlayIcon({ kind }: { kind: PlayIconKind }) {
  return (
    <span aria-hidden="true" className="relative flex items-center justify-center w-5 h-5">
      {kind === "tree" && <TreeMarkIcon className="absolute -left-1.5 -top-1.5 w-8 h-8 opacity-35" />}
      {kind === "map" && <RegionGlobeIcon className="absolute -left-1.5 -top-1.5 w-8 h-8 opacity-35" />}
      {kind === "tree-map" && (
        <>
          <TreeMarkIcon className="absolute -left-1.5 -top-1.5 w-8 h-8 opacity-35 [clip-path:inset(0_50%_0_0)]" />
          <RegionGlobeIcon className="absolute -left-1.5 -top-1.5 w-8 h-8 opacity-35 [clip-path:inset(0_0_0_50%)]" />
        </>
      )}
      <Play className="relative w-5 h-5 fill-[var(--color-surface)]" />
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
