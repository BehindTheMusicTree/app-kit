"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { useSession } from "../auth/SessionContext";
import { Scope } from "../transport/lib/scope";
import { genrePlaylistQueryKeys } from "./api/genre-playlists";
import { CriteriaPlaylistMinimum } from "./schemas/criteria-playlist/minimum";
import { TrackBase } from "./schemas/track/base";
import { useTrackList } from "./TrackListContext";

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
          {tracks.map((track, index) => (
            <li key={track.uuid}>
              <button
                type="button"
                className="w-full truncate py-0.5 text-left hover:underline"
                onClick={() => play(index)}
              >
                {track.title}
                {track.artists?.length ? ` — ${track.artists.map((artist) => artist.name).join(", ")}` : ""}
              </button>
            </li>
          ))}
          {hasNextPage && <li ref={sentinelRef} aria-hidden="true" className="h-4" />}
        </ul>
      )}
    </div>
  );
}
