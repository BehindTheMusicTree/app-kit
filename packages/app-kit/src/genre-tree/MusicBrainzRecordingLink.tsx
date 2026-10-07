"use client";

import { FaExternalLinkAlt } from "react-icons/fa";

import { musicBrainzRecordingUrl } from "./schemas/youtube-track/detailed";

export function MusicBrainzRecordingLink({ track, title }: { track: object; title: string }) {
  const url = musicBrainzRecordingUrl(track);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${title} on MusicBrainz`}
      title="View on MusicBrainz"
      className="inline-flex shrink-0 items-center text-gray-400 hover:text-gray-200"
      onClick={(event) => event.stopPropagation()}
    >
      <FaExternalLinkAlt size={10} />
    </a>
  );
}
