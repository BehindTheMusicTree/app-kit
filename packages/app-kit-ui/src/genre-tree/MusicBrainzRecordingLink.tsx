"use client";

import { FaExternalLinkAlt } from "react-icons/fa";

import { SongDetailed, musicBrainzRecordingUrl } from "@behindthemusictree/app-kit/genre-tree";

export function MusicBrainzRecordingLink({ song }: { song: SongDetailed }) {
  const url = musicBrainzRecordingUrl(song);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${song.title} on MusicBrainz`}
      title="View on MusicBrainz"
      className="inline-flex shrink-0 items-center opacity-50 hover:opacity-100 focus-visible:opacity-100"
      onClick={(event) => event.stopPropagation()}
    >
      <FaExternalLinkAlt size={10} />
    </a>
  );
}
