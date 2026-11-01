"use client";

import { useEffect, useMemo } from "react";

import {
  CriteriaPlaylistSimple,
  ReparentCandidate,
  type GenreUuid,
  getReparentCandidates,
  useUpdateGenre,
} from "@behindthemusictree/app-kit/genre-tree";
import type { Scope } from "@behindthemusictree/app-kit/transport";
import BasePopup from "../popup/BasePopup";
import GenreSearch from "./GenreSearch";

export type ParentChange = { genre: GenreUuid; from: GenreUuid | null; to: GenreUuid };

type ChangeParentPopupProps = {
  genrePlaylist: ReparentCandidate;
  genrePlaylists: CriteriaPlaylistSimple[];
  scope: Scope;
  getBackendBaseUrl: () => string;
  onClose: () => void;
  onParentChanged?: (change: ParentChange) => void;
};

export default function ChangeParentPopup({
  genrePlaylist,
  genrePlaylists,
  scope,
  getBackendBaseUrl,
  onClose,
  onParentChanged,
}: ChangeParentPopupProps) {
  const { mutate, isPending, formErrors } = useUpdateGenre(scope, getBackendBaseUrl);
  const candidates = useMemo(
    () => getReparentCandidates(genrePlaylists, genrePlaylist.uuid),
    [genrePlaylists, genrePlaylist.uuid],
  );

  const handleSelect = (newParent: ReparentCandidate) => {
    const genre = genrePlaylist.criteria.uuid;
    const parentPlaylistUuid = genrePlaylist.parent?.uuid;
    const from = parentPlaylistUuid
      ? (genrePlaylists.find(({ uuid }) => uuid === parentPlaylistUuid)?.criteria?.uuid ?? null)
      : null;
    mutate(
      { uuid: genre, data: { parent: newParent.criteria.uuid } },
      {
        onSuccess: () => {
          onClose();
          onParentChanged?.({ genre, from, to: newParent.criteria.uuid });
        },
      },
    );
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <BasePopup title={`Change parent of ${genrePlaylist.name}`} onClose={onClose} showCancelButton fitContent>
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
        Current parent: {genrePlaylist.parent?.name ?? "none"}
      </p>
      <div aria-busy={isPending} className={isPending ? "pointer-events-none opacity-60" : undefined}>
        <GenreSearch
          genrePlaylists={candidates}
          onSelect={handleSelect}
          placeholder="Search a new parent…"
        />
      </div>
      {formErrors.length > 0 && (
        <p role="alert" className="mt-3 text-sm text-[var(--color-red-500)]">
          {formErrors.map(({ message }) => message).join(" ")}
        </p>
      )}
    </BasePopup>
  );
}
