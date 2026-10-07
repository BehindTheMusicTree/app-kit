"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FaPlay, FaPause } from "react-icons/fa";
import { RingLoader } from "@behindthemusictree/ui";

import { useSession } from "../auth/SessionContext";
import { usePlayer } from "../player/PlayerContext";
import { PlayStates } from "../player/PlayStates";
import { Scope } from "../transport/lib/scope";
import { genrePlaylistQueryKeys } from "./api/genre-playlists";
import { CriteriaPlaylistMinimum } from "./schemas/criteria-playlist/minimum";
import { TrackBase } from "./schemas/track/base";
import { unplayableReasonLabel } from "./schemas/youtube-track/detailed";
import { useTrackList } from "./TrackListContext";
import { MusicBrainzRecordingLink } from "./MusicBrainzRecordingLink";

export type GenrePlaylistTracksProps = {
  genrePlaylist: CriteriaPlaylistMinimum;
  scope: Scope;
  getBackendBaseUrl: () => string;
};

export function GenrePlaylistTracks<T extends TrackBase>({
  genrePlaylist,
  scope,
  getBackendBaseUrl,
}: GenrePlaylistTracksProps) {
  const { fetchGenrePlaylistTracksPage, playNewTrackListFromGenrePlaylist } = useTrackList<T>();
  const { session, sessionRestored } = useSession();
  const { playerTrackObject, playState, handlePlayPauseAction } = usePlayer();
  const { uuid } = genrePlaylist;

  const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey:
      scope === "me"
        ? genrePlaylistQueryKeys.me.tracks(uuid)
        : genrePlaylistQueryKeys.reference.tracks(getBackendBaseUrl(), uuid),
    queryFn: ({ pageParam }) => fetchGenrePlaylistTracksPage(uuid, scope, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: scope !== "me" || (sessionRestored && !!session?.accessToken),
  });

  const sentinelRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!hasNextPage || isFetchingNextPage || !sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const pages = data?.pages ?? [];
  const tracks = pages.flatMap((page) => page.tracks);
  const total = pages[0]?.total;

  const play = (startIndex: number) => {
    const lastPage = pages[pages.length - 1];
    playNewTrackListFromGenrePlaylist(genrePlaylist, scope, {
      tracks,
      total: lastPage.total,
      nextPage: lastPage.nextPage,
      startIndex,
    }).catch((error) => console.error("Failed to play genre playlist:", error));
  };

  return (
    <div className="gtv-info-panel-children">
      <span className="gtv-info-panel-children-title">Tracks{total !== undefined && ` (${total})`}</span>
      {isPending ? (
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" aria-busy="true" />
      ) : tracks.length === 0 ? (
        <p>—</p>
      ) : (
        <ul className="max-h-64 overflow-y-auto" aria-label={`${genrePlaylist.name} tracks`}>
          {tracks.map((track, index) => {
            const label = track.artists?.length
              ? `${track.title} — ${track.artists.map((artist) => artist.name).join(", ")}`
              : track.title;
            const isCurrent = playerTrackObject?.track.id === track.uuid;
            const isPlaying = isCurrent && playState === PlayStates.PLAYING;
            const unplayableReason = unplayableReasonLabel(track);
            if (unplayableReason) {
              return (
                <li key={track.uuid} className="flex items-center gap-1 py-0.5 opacity-50" title={unplayableReason}>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    aria-label={`${label} — ${unplayableReason}`}
                    className="flex w-4 shrink-0 items-center justify-center p-0 [font-size:inherit] bg-transparent rounded-none border-0 opacity-0 cursor-not-allowed"
                  >
                    <FaPlay size={10} />
                  </button>
                  <span className="min-w-0 truncate">{label}</span>
                  <MusicBrainzRecordingLink track={track} title={track.title} />
                  <span className="shrink-0 text-xs">{unplayableReason}</span>
                </li>
              );
            }
            return (
              <li key={track.uuid} className="group flex items-center gap-1 py-0.5">
                <button
                  type="button"
                  aria-label={`${isPlaying ? "Pause" : "Play"} ${label}`}
                  className={`flex w-4 shrink-0 items-center justify-center p-0 [font-size:inherit] bg-transparent rounded-none border-0 cursor-pointer group-hover:opacity-100 focus-visible:opacity-100 ${isCurrent && playState !== PlayStates.STOPPED ? "opacity-100" : "opacity-0"}`}
                  onClick={() => (isCurrent ? handlePlayPauseAction() : play(index))}
                >
                  {isCurrent && playState === PlayStates.LOADING ? (
                    <RingLoader size={10} />
                  ) : isPlaying ? (
                    <FaPause size={10} />
                  ) : (
                    <FaPlay size={10} />
                  )}
                </button>
                <span className="min-w-0 truncate">{label}</span>
                <MusicBrainzRecordingLink track={track} title={track.title} />
              </li>
            );
          })}
          {hasNextPage && <li ref={sentinelRef} aria-hidden="true" className="h-4" />}
        </ul>
      )}
    </div>
  );
}
