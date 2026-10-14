"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FaPlay, FaPause } from "react-icons/fa";
import { RingLoader } from "@behindthemusictree/ui";

import { useSession } from "../auth/SessionContext";
import { useFetchWrapper } from "../transport/useFetchWrapper";
import { PaginatedResponseSchema } from "../transport/lib/paginated-response";
import { parseWithLog } from "../transport/lib/parse-with-log";
import { usePlayer } from "../player/PlayerContext";
import { PlayStates } from "../player/PlayStates";
import { Scope } from "../transport/lib/scope";
import { genrePlaylistQueryKeys } from "./api/genre-playlists";
import { libraryEndpoints, libraryQueryKeys } from "./api/library";
import { CriteriaPlaylistMinimum } from "./schemas/criteria-playlist/minimum";
import { TrackBase } from "./schemas/track/base";
import { isRecording, recordingUnplayableReason, RecordingDetailedSchema } from "./schemas/recording/detailed";
import { GenrePlaylistTracksPage, useTrackList } from "./TrackListContext";
import { MusicBrainzRecordingLink } from "./MusicBrainzRecordingLink";
import { ArtistNames, RenderArtistLink } from "./ArtistNames";

const CATALOGUE_PAGE_SIZE = 100;
const RecordingPageSchema = PaginatedResponseSchema(RecordingDetailedSchema);

export type GenrePlaylistTracksProps = {
  genreUuid: string;
  genrePlaylist: CriteriaPlaylistMinimum;
  scope: Scope;
  getBackendBaseUrl: () => string;
  /** When set, artist names render through it (e.g. a router `Link`). */
  renderArtistLink?: RenderArtistLink;
};

/**
 * "reference" lists the genre's whole recordings catalogue (genre subtree), playable or not, while
 * playing goes through the playable-only playlist. Other scopes have no catalogue endpoint; their
 * playlist is the catalogue (e.g. hear's uploaded tracks are always playable).
 */
export function GenrePlaylistTracks({
  genreUuid,
  genrePlaylist,
  scope,
  getBackendBaseUrl,
  renderArtistLink,
}: GenrePlaylistTracksProps) {
  const { fetchGenrePlaylistTracksPage, playNewTrackListFromGenrePlaylist } = useTrackList();
  const { session, sessionRestored } = useSession();
  const { playerTrackObject, playState, handlePlayPauseAction } = usePlayer();
  const { uuid } = genrePlaylist;

  const { fetch } = useFetchWrapper(getBackendBaseUrl);

  const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey:
      scope === "me"
        ? genrePlaylistQueryKeys.me.tracks(uuid)
        : libraryQueryKeys.reference.recordings.byGenre(getBackendBaseUrl(), genreUuid),
    queryFn: async ({ pageParam }): Promise<GenrePlaylistTracksPage<TrackBase>> => {
      if (scope === "me") return fetchGenrePlaylistTracksPage(uuid, scope, pageParam);
      const response = await fetch(
        libraryEndpoints.reference.recordings.list(),
        true,
        false,
        {},
        { genre: genreUuid, page: pageParam, pageSize: CATALOGUE_PAGE_SIZE },
      );
      const parsed = parseWithLog(RecordingPageSchema, response, "GenrePlaylistTracks");
      return { tracks: parsed.results, total: parsed.overallTotal, nextPage: parsed.next ? parsed.page + 1 : null };
    },
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

  const play = (startRecordingUuid: string) => {
    playNewTrackListFromGenrePlaylist(genrePlaylist, scope, { startRecordingUuid }).catch((error) =>
      console.error("Failed to play genre playlist:", error),
    );
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
          {tracks.map((track) => {
            const label = track.artists?.length
              ? `${track.title} — ${track.artists.map((artist) => artist.name).join(", ")}`
              : track.title;
            const isCurrent = playerTrackObject?.track.id === track.uuid;
            const isPlaying = isCurrent && playState === PlayStates.PLAYING;
            const unplayableReason = isRecording(track) ? recordingUnplayableReason(track) : null;
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
                  <span className="min-w-0 truncate">
                    {track.title}
                    {track.artists?.length ? (
                      <>
                        {" — "}
                        <ArtistNames artists={track.artists} renderArtistLink={renderArtistLink} />
                      </>
                    ) : null}
                  </span>
                  {isRecording(track) && <MusicBrainzRecordingLink recording={track} />}
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
                  onClick={() => (isCurrent ? handlePlayPauseAction() : play(track.uuid))}
                >
                  {isCurrent && playState === PlayStates.LOADING ? (
                    <RingLoader size={10} />
                  ) : isPlaying ? (
                    <FaPause size={10} />
                  ) : (
                    <FaPlay size={10} />
                  )}
                </button>
                <span className="min-w-0 truncate">
                    {track.title}
                    {track.artists?.length ? (
                      <>
                        {" — "}
                        <ArtistNames artists={track.artists} renderArtistLink={renderArtistLink} />
                      </>
                    ) : null}
                  </span>
                {isRecording(track) && <MusicBrainzRecordingLink recording={track} />}
              </li>
            );
          })}
          {hasNextPage && <li ref={sentinelRef} aria-hidden="true" className="h-4" />}
        </ul>
      )}
    </div>
  );
}
