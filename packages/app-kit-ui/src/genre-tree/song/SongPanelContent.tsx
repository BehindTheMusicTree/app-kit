"use client";

import { useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { FieldList, PanelSection, Skeleton } from "@behindthemusictree/ui";
import { PlayStates, usePlayer } from "@behindthemusictree/app-kit/player";
import {
  ArtistNames,
  musicBrainzRecordingUrl,
  songUnplayableReason,
  useSongHistory,
  useTrackList,
  type CriteriaMinimum,
  type CriteriaPlaylistSimple,
  type RenderArtistLink,
  type SongDetailed,
} from "@behindthemusictree/app-kit/genre-tree";
import type { Scope } from "@behindthemusictree/app-kit/transport";
import ShareActionButton from "../ShareActionButton";
import type { GenreTreeShareTarget } from "../share";

export type SongPanelContentProps = {
  song: SongDetailed;
  scope: Scope;
  getBackendBaseUrl: () => string;
  shareUrl?: string;
  renderArtistLink: RenderArtistLink;
} & (
  | {
      /** Root-to-leaf playlists of the song's genre in the loaded tree; empty when the tree doesn't hold it. */
      genrePath: CriteriaPlaylistSimple[];
      onSelectGenrePlaylist: (genrePlaylist: CriteriaPlaylistSimple) => void;
      onSelectGenre?: never;
    }
  | {
      /** The genre alone opens, for a host without a tree. */
      onSelectGenre: (genre: CriteriaMinimum) => void;
      genrePath?: never;
      onSelectGenrePlaylist?: never;
    }
);

const numberFormat = new Intl.NumberFormat("en");
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

const externalLink = "text-[var(--color-primary)] hover:underline focus-visible:underline";

function SongHistory({ uuid, getBackendBaseUrl }: { uuid: string; getBackendBaseUrl: () => string }) {
  const [open, setOpen] = useState(false);
  const history = useSongHistory(uuid, getBackendBaseUrl, open);
  let body: ReactNode = null;
  if (history.status === "loading") body = <Skeleton className="h-10" aria-busy="true" />;
  else if (history.status === "error") body = <p className="text-red-600">Could not load the history.</p>;
  else if (history.status === "success")
    body =
      history.entries.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">No changes yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {history.entries.map((entry) => (
            <li key={entry.uuid} className="py-1.5 text-sm">
              <span className="font-medium">{entry.action}</span>
              {entry.oldValue !== null || entry.newValue !== null ? (
                <span className="text-[var(--color-text-muted)]">
                  {" "}
                  — {entry.oldValue ?? "none"} → {entry.newValue ?? "none"}
                </span>
              ) : null}
              <span className="block text-xs text-[var(--color-text-muted)]">
                {entry.actorPseudo ?? "Anonymous"} · {dateFormat.format(new Date(entry.createdOn))}
              </span>
            </li>
          ))}
        </ul>
      );

  return (
    <details
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="px-6 pb-2.5 mt-2.5 border-t border-[var(--color-border)]"
    >
      <summary className="mt-2.5 cursor-pointer text-[0.6875rem] font-semibold uppercase text-[var(--color-text-muted)]">
        History
      </summary>
      <div className="mt-1.5">{body}</div>
    </details>
  );
}

export default function SongPanelContent(props: SongPanelContentProps) {
  const { song, scope, getBackendBaseUrl, shareUrl, renderArtistLink } = props;
  const { playNewTrackListFromTrackUuid } = useTrackList<SongDetailed>();
  const { playerTrackObject, playState, handlePlayPauseAction } = usePlayer();
  const unplayableReason = songUnplayableReason(song);
  const isCurrent = playerTrackObject?.track.id === song.uuid;
  const isPlaying = isCurrent && playState === PlayStates.PLAYING;
  const shareTarget: GenreTreeShareTarget = { kind: "song", uuid: song.uuid, name: song.title, scope };
  const musicBrainzUrl = musicBrainzRecordingUrl(song);

  const fields: { label: string; value: ReactNode }[] = [];
  if (song.genre) {
    const path = props.genrePath && props.genrePath.length > 0 ? props.genrePath : null;
    const { onSelectGenre } = props;
    const genre = song.genre;
    fields.push({
      label: "Genre",
      value: onSelectGenre ? (
        <button type="button" onClick={() => onSelectGenre(genre)} className="hover:underline">
          {genre.name}
        </button>
      ) : path ? (
        <span className="flex flex-wrap items-center gap-x-1">
          {path.map((genrePlaylist, index) => (
            <span key={genrePlaylist.uuid}>
              {index > 0 && <span aria-hidden="true">› </span>}
              <button type="button" onClick={() => props.onSelectGenrePlaylist?.(genrePlaylist)} className="hover:underline">
                {genrePlaylist.name}
              </button>
            </span>
          ))}
        </span>
      ) : (
        song.genre.name
      ),
    });
  } else {
    fields.push({ label: "Genre", value: <span className="text-[var(--color-text-muted)]">No genre</span> });
  }
  if (song.firstReleaseYear) fields.push({ label: "First released", value: song.firstReleaseYear });
  const viewCount = song.youtubeVideo?.viewCount;
  if (viewCount !== null && viewCount !== undefined)
    fields.push({ label: "YouTube views", value: numberFormat.format(viewCount) });
  fields.push({ label: "Plays", value: numberFormat.format(song.playCount) });
  const links: ReactNode[] = [];
  if (musicBrainzUrl)
    links.push(
      <a key="mb" href={musicBrainzUrl} target="_blank" rel="noopener noreferrer" className={externalLink}>
        MusicBrainz
      </a>,
    );
  if (song.youtubeVideo)
    links.push(
      <a
        key="yt"
        href={`https://www.youtube.com/watch?v=${encodeURIComponent(song.youtubeVideo.id)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={externalLink}
      >
        YouTube
      </a>,
    );
  if (links.length > 0)
    fields.push({
      label: "Links",
      value: <span className="flex gap-3">{links}</span>,
    });

  return (
    <>
      <div className="genre-action-band border-b border-[var(--color-border)]">
        <div className="flex flex-wrap gap-1 px-3.5 py-3">
          {unplayableReason ? (
            <p className="flex items-center px-2.5 text-sm text-[var(--color-text-muted)]">{unplayableReason}</p>
          ) : (
            <button
              type="button"
              onClick={() => (isCurrent ? handlePlayPauseAction() : playNewTrackListFromTrackUuid(song, scope))}
              className="group flex flex-col items-center gap-1 w-16 text-xs text-center text-[var(--color-text)] focus-visible:outline-none"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-full group-focus-visible:ring-2 group-focus-visible:ring-[var(--color-focus-ring)] bg-[var(--color-surface-muted)] transition-colors group-hover:bg-[var(--color-border)]">
                {isPlaying ? (
                  <Pause aria-hidden="true" className="w-5 h-5" />
                ) : (
                  <Play aria-hidden="true" className="w-5 h-5" />
                )}
              </span>
              {isPlaying ? "Pause" : "Play"}
            </button>
          )}
          {shareUrl && <ShareActionButton target={shareTarget} url={shareUrl} />}
        </div>
      </div>
      {song.artists && song.artists.length > 0 && (
        <p className="px-6 pt-2.5 text-[var(--color-text-muted)]">
          <ArtistNames artists={song.artists} renderArtistLink={renderArtistLink} />
        </p>
      )}
      <FieldList items={fields} />
      {song.essentialGenres && song.essentialGenres.length > 0 && (
        <PanelSection title="Essential in">
          <ul>
            {song.essentialGenres.map((genre) => (
              <li key={genre.uuid} className="py-0.5">
                {genre.name}
              </li>
            ))}
          </ul>
        </PanelSection>
      )}
      <SongHistory uuid={song.uuid} getBackendBaseUrl={getBackendBaseUrl} />
    </>
  );
}
