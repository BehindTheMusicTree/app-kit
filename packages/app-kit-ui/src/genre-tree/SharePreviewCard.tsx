"use client";

import { Music, Music2, UserRound } from "lucide-react";
import type { GenreTreeShareTarget } from "./share";

type SharePreviewCardProps = {
  target: GenreTreeShareTarget;
  url: string;
};

export default function SharePreviewCard({ target, url }: SharePreviewCardProps) {
  const Icon = { genre: Music2, artist: UserRound, song: Music }[target.kind];
  const typeLabel = { genre: "Genre", artist: "Artist", song: "Song" }[target.kind];

  return (
    <div className="rounded-3xl bg-[var(--color-surface-muted)] p-4">
      <div className="flex min-h-32 overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-lg">
        <div className="flex w-28 shrink-0 items-center justify-center bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
          <Icon aria-hidden="true" className="h-10 w-10" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{typeLabel}</span>
          <span className="truncate text-base font-semibold text-[var(--color-text)]" title={target.name}>
            {target.name}
          </span>
          <span className="truncate text-sm text-[var(--color-primary)]" title={url}>
            {url}
          </span>
        </div>
      </div>
    </div>
  );
}
