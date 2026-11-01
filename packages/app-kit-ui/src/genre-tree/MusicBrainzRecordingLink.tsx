"use client";

import type { ReactNode } from "react";

import { SongDetailed, musicBrainzRecordingUrl } from "@behindthemusictree/app-kit/genre-tree";

export function MusicBrainzRecordingLink({
  song,
  children,
  className = "",
}: {
  song: SongDetailed;
  children: ReactNode;
  className?: string;
}) {
  const url = musicBrainzRecordingUrl(song);
  if (!url) return <>{children}</>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${song.title} on MusicBrainz`}
      className={className}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  );
}
