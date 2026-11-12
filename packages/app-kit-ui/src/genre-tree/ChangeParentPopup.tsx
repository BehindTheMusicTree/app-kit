"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CriteriaPlaylistSimple,
  ReparentCandidate,
  type GenreUuid,
  getReparentCandidates,
  useUpdateGenre,
} from "@behindthemusictree/app-kit/genre-tree";
import type { Scope } from "@behindthemusictree/app-kit/transport";
import { Button } from "@behindthemusictree/ui";
import BasePopup from "../popup/BasePopup";
import { PopupButtons } from "../popup/PopupButtons";
import GenreSearch from "./GenreSearch";

export type ParentChange = { genre: GenreUuid; from: GenreUuid | null; to: GenreUuid | null };

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

  const [confirmingRoot, setConfirmingRoot] = useState(false);

  const handleMove = (to: GenreUuid | null) => {
    const genre = genrePlaylist.criteria.uuid;
    const parentPlaylistUuid = genrePlaylist.parent?.uuid;
    const from = parentPlaylistUuid
      ? (genrePlaylists.find(({ uuid }) => uuid === parentPlaylistUuid)?.criteria?.uuid ?? null)
      : null;
    mutate(
      { uuid: genre, data: { parent: to } },
      {
        onSuccess: () => {
          onClose();
          onParentChanged?.({ genre, from, to });
        },
      },
    );
  };

  const handleSelect = (newParent: ReparentCandidate) => handleMove(newParent.criteria.uuid);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <BasePopup title={`Change parent of ${genrePlaylist.name}`} onClose={onClose} showCancelButton fitContent>
      <p className="mb-3 text-body text-[var(--color-text-muted)]">
        Current parent: {genrePlaylist.parent?.name ?? "none"}
      </p>
      {genrePlaylist.parent &&
        (confirmingRoot ? (
          <div className="mb-3 text-sm">
            <p className="mb-2">
              {genrePlaylist.name} and its descendants will no longer be under {genrePlaylist.parent.name}.
            </p>
            <PopupButtons alignment="left">
              <Button disabled={isPending} onClick={() => handleMove(null)}>
                Confirm
              </Button>
              <Button variant="secondary" disabled={isPending} onClick={() => setConfirmingRoot(false)}>
                Back
              </Button>
            </PopupButtons>
          </div>
        ) : (
          <div className="mb-3">
            <Button variant="secondary" onClick={() => setConfirmingRoot(true)}>
              Make root
            </Button>
          </div>
        ))}
      <div aria-busy={isPending} className={isPending ? "pointer-events-none opacity-60" : undefined}>
        <GenreSearch
          genrePlaylists={candidates}
          onSelect={handleSelect}
          placeholder="Search a new parent…"
        />
      </div>
      {formErrors.length > 0 && (
        <p role="alert" className="mt-3 text-body text-[var(--color-red-500)]">
          {formErrors.map(({ message }) => message).join(" ")}
        </p>
      )}
    </BasePopup>
  );
}
