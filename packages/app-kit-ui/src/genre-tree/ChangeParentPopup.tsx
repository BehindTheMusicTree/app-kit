"use client";

import { useEffect, useMemo } from "react";

import { CriteriaPlaylistSimple, getReparentCandidates, useUpdateGenre } from "@behindthemusictree/app-kit/genre-tree";
import type { Scope } from "@behindthemusictree/app-kit/transport";
import BasePopup from "../popup/BasePopup";
import GenreSearch from "./GenreSearch";

type ChangeParentPopupProps = {
  genrePlaylist: CriteriaPlaylistSimple;
  genrePlaylists: CriteriaPlaylistSimple[];
  scope: Scope;
  getBackendBaseUrl: () => string;
  onClose: () => void;
};

export default function ChangeParentPopup({
  genrePlaylist,
  genrePlaylists,
  scope,
  getBackendBaseUrl,
  onClose,
}: ChangeParentPopupProps) {
  const { mutate, isPending, formErrors } = useUpdateGenre(scope, getBackendBaseUrl);
  const candidates = useMemo(
    () => getReparentCandidates(genrePlaylists, genrePlaylist.uuid),
    [genrePlaylists, genrePlaylist.uuid],
  );

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
          onSelect={(newParent) =>
            mutate({ uuid: genrePlaylist.uuid, data: { parent: newParent.uuid } }, { onSuccess: onClose })
          }
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
