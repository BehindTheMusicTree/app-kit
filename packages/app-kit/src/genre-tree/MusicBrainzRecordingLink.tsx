"use client";

import { FaExternalLinkAlt } from "react-icons/fa";

import { RecordingDetailed, musicBrainzRecordingUrl } from "./schemas/recording/detailed";

export function MusicBrainzRecordingLink({ recording }: { recording: RecordingDetailed }) {
  const url = musicBrainzRecordingUrl(recording);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${recording.title} on MusicBrainz`}
      title="View on MusicBrainz"
      className="inline-flex shrink-0 items-center text-gray-400 hover:text-gray-200"
      onClick={(event) => event.stopPropagation()}
    >
      <FaExternalLinkAlt size={10} />
    </a>
  );
}
