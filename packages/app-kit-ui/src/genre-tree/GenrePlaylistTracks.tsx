"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { z } from "zod";
import { FaPlay, FaPause } from "react-icons/fa";
import { RingLoader } from "@behindthemusictree/ui";

import { useSession } from "@behindthemusictree/app-kit/auth";
import { useFetchWrapper } from "@behindthemusictree/app-kit/transport";
import { PaginatedResponseSchema } from "@behindthemusictree/app-kit/transport";
import { parseWithLog } from "@behindthemusictree/app-kit/transport";
import { usePlayer } from "@behindthemusictree/app-kit/player";
import { PlayStates } from "@behindthemusictree/app-kit/player";
import { usePopup } from "@behindthemusictree/app-kit/popup";
import InternalErrorPopup from "../popup/InternalErrorPopup";
import { ErrorCode } from "@behindthemusictree/app-kit/transport";
import { Scope } from "@behindthemusictree/app-kit/transport";
import { genrePlaylistQueryKeys } from "@behindthemusictree/app-kit/genre-tree";
import { libraryEndpoints, libraryQueryKeys } from "@behindthemusictree/app-kit/genre-tree";
import { CriteriaPlaylistMinimum } from "@behindthemusictree/app-kit/genre-tree";
import { TrackBase } from "@behindthemusictree/app-kit/genre-tree";
import { isRecording, recordingUnplayableReason, RecordingDetailedSchema } from "@behindthemusictree/app-kit/genre-tree";
import { GenrePlaylistTracksPage, useTrackList } from "@behindthemusictree/app-kit/genre-tree";
import { MusicBrainzRecordingLink } from "./MusicBrainzRecordingLink";
import { ArtistNames, RenderArtistLink } from "@behindthemusictree/app-kit/genre-tree";
import { capitalize, useTrackNoun } from "@behindthemusictree/app-kit/track-noun";

const CATALOGUE_PAGE_SIZE = 100;
// withTotal=false: the backend skips COUNT(*) and pages by keyset cursor, so huge genre subtrees
// stay O(page) at any depth; page numbers and totals are then null.
const RecordingPageSchema = PaginatedResponseSchema(RecordingDetailedSchema).extend({
  overallTotal: z.number().nullable(),
  page: z.number().nullable(),
  totalPages: z.number().nullable(),
});

// Container query on the list (arbitrary variant: Tailwind 3 core has no `@container`): once the
// list is wide (expanded info panel), title, artist and album become columns instead of one line.
// Class names stay literal so Tailwind's scanner sees them.
const TEXT_CELL = "min-w-0 flex-1 truncate [@container(min-width:40rem)]:flex [@container(min-width:40rem)]:gap-2";
const TITLE_CELL = "[@container(min-width:40rem)]:flex-[2] [@container(min-width:40rem)]:truncate";
const COLUMN_CELL = "[@container(min-width:40rem)]:flex-1 [@container(min-width:40rem)]:truncate";
const ALBUM_CELL = `hidden [@container(min-width:40rem)]:block ${COLUMN_CELL}`;
const SEPARATOR = "[@container(min-width:40rem)]:hidden";

const nextCursor = (next: string): string => {
  const cursor = new URL(next).searchParams.get("cursor");
  if (!cursor) throw new Error(`Recordings next link has no cursor: ${next}`);
  return cursor;
};

// Recordings are not narrowed to RecordingDetailed here: "me" scope lists uploaded tracks too.
export type GenrePlaylistTracksSlots = {
  /** Rendered first in each row, e.g. a selection checkbox. `index` is the row's position in the loaded list. */
  renderRecordingLeading?: (recording: TrackBase, index: number) => ReactNode;
  /** Rendered last in each row. The recording's own genre is `recording.genre`. */
  renderRecordingActions?: (recording: TrackBase) => ReactNode;
  /** Rendered between the title and the list, e.g. a "+ Link" button or a selection bar. */
  renderTracksToolbar?: () => ReactNode;
};

export type GenrePlaylistTracksProps = GenrePlaylistTracksSlots & {
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
  renderRecordingLeading,
  renderRecordingActions,
  renderTracksToolbar,
}: GenrePlaylistTracksProps) {
  const { fetchGenrePlaylistTracksPage, playNewTrackListFromGenrePlaylist } = useTrackList();
  const { session, sessionRestored } = useSession();
  const { playerTrackObject, playState, handlePlayPauseAction } = usePlayer();
  const { showPopup } = usePopup();
  const trackNoun = useTrackNoun();
  const { uuid } = genrePlaylist;

  const { fetch } = useFetchWrapper(getBackendBaseUrl);

  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey:
      scope === "me"
        ? genrePlaylistQueryKeys.me.tracks(uuid)
        : libraryQueryKeys.reference.recordings.byGenre(getBackendBaseUrl(), genreUuid),
    queryFn: async ({ pageParam }): Promise<Omit<GenrePlaylistTracksPage<TrackBase>, "total" | "nextPage"> & { total: number | null; nextPage: number | string | null }> => {
      if (scope === "me") return fetchGenrePlaylistTracksPage(uuid, scope, Number(pageParam));
      const response = await fetch(
        libraryEndpoints.reference.recordings.list(),
        true,
        false,
        {},
        { genre: genreUuid, pageSize: CATALOGUE_PAGE_SIZE, withTotal: false, ...(pageParam && { cursor: pageParam }) },
      );
      const parsed = parseWithLog(RecordingPageSchema, response, "GenrePlaylistTracks");
      return { tracks: parsed.results, total: parsed.overallTotal, nextPage: parsed.next ? nextCursor(parsed.next) : null };
    },
    initialPageParam: scope === "me" ? 1 : "",
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
  const total = pages[0]?.total ?? undefined;

  const play = (startRecordingUuid: string) => {
    playNewTrackListFromGenrePlaylist(genrePlaylist, scope, { startRecordingUuid }).catch((error) => {
      console.error("Failed to play genre playlist:", error);
      showPopup(<InternalErrorPopup errorCode={ErrorCode.CLIENT_UNKNOWN} />);
    });
  };

  return (
    <div className="gtv-info-panel-children">
      <span className="gtv-info-panel-children-title">{capitalize(trackNoun.plural)}{total !== undefined && ` (${total})`}</span>
      {renderTracksToolbar?.()}
      {isPending ? (
        <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-neutral-200)]" aria-busy="true" />
      ) : isError && tracks.length === 0 ? (
        <p role="alert">
          Couldn&apos;t load {trackNoun.plural}.{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </p>
      ) : tracks.length === 0 ? (
        <p>—</p>
      ) : (
        <ul className="mt-1 max-h-64 overflow-y-auto text-[13px] leading-[1.45] [container-type:inline-size]" aria-label={`${genrePlaylist.name} ${trackNoun.plural}`}>
          {tracks.map((track, index) => {
            const label = track.artists?.length
              ? `${track.title} — ${track.artists.map((artist) => artist.name).join(", ")}`
              : track.title;
            const isCurrent = playerTrackObject?.track.id === track.uuid;
            const isPlaying = isCurrent && playState === PlayStates.PLAYING;
            const text = (
              <span className={TEXT_CELL}>
                <span className={TITLE_CELL}>{track.title}</span>
                {track.artists?.length ? <span className={SEPARATOR}>{" — "}</span> : null}
                <span className={COLUMN_CELL}>
                  {track.artists?.length ? (
                    <ArtistNames artists={track.artists} renderArtistLink={renderArtistLink} />
                  ) : null}
                </span>
                {track.album && <span className={ALBUM_CELL}>{track.album.name}</span>}
              </span>
            );
            const leading = renderRecordingLeading?.(track, index);
            const actions = renderRecordingActions?.(track);
            const unplayableReason = isRecording(track) ? recordingUnplayableReason(track) : null;
            if (unplayableReason) {
              return (
                <li key={track.uuid} className="flex min-h-8 items-center gap-1 px-1 opacity-50" title={unplayableReason}>
                  {leading}
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    aria-label={`${label} — ${unplayableReason}`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center p-0 [font-size:inherit] bg-transparent rounded-full border-0 opacity-0 cursor-not-allowed"
                  >
                    <FaPlay size={10} />
                  </button>
                  {text}
                  {isRecording(track) && <MusicBrainzRecordingLink recording={track} />}
                  <span className="shrink-0 text-xs">{unplayableReason}</span>
                  {actions}
                </li>
              );
            }
            return (
              <li
                key={track.uuid}
                className={`group flex min-h-8 items-center gap-1 rounded px-1 hover:bg-[var(--color-neutral-100)] ${isCurrent ? "font-medium text-[var(--color-primary)]" : ""}`}
              >
                {leading}
                <button
                  type="button"
                  aria-label={`${isPlaying ? "Pause" : "Play"} ${label}`}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center p-0 [font-size:inherit] bg-transparent rounded-full border-0 cursor-pointer group-hover:opacity-100 focus-visible:opacity-100 ${isCurrent && playState !== PlayStates.STOPPED ? "opacity-100" : "opacity-0 [@media(pointer:coarse)]:opacity-100"}`}
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
                {text}
                {isRecording(track) && <MusicBrainzRecordingLink recording={track} />}
                {actions}
              </li>
            );
          })}
          {hasNextPage && <li ref={sentinelRef} aria-hidden="true" className="h-4" />}
        </ul>
      )}
    </div>
  );
}
