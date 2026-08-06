"use client";

import { useState, useMemo } from "react";
import { FaTree } from "react-icons/fa";
import { Plus } from "lucide-react";
import { IconTextButton } from "../ui/IconTextButton";

import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";
import { CriteriaMinimum } from "./schemas/criteria/minimum";
import { Scope } from "../transport/lib/scope";
import { useListFullGenrePlaylists } from "./useGenrePlaylist";
import { useLoadExampleTreeGenre } from "./useGenre";
import { getGenrePlaylistsGroupedByRoot } from "./lib/genre-playlist-helpers";

import GenrePlaylistTreePerRoot from "./playlist-tree/TreePerRoot";
import { GenreTreeSkeleton } from "./GenreTreeSkeleton";

export type GenreTreeViewProps = {
  scope: Scope;
  handleGenreCreationAction: (parent: CriteriaMinimum | null) => void;
  handleGenreRenameAction?: (genre: CriteriaMinimum) => void;
  getBackendBaseUrl: () => string;
  uploadTimeoutMs: number;
};

export function GenreTreeView({
  scope,
  handleGenreCreationAction,
  handleGenreRenameAction,
  getBackendBaseUrl,
  uploadTimeoutMs,
}: GenreTreeViewProps) {
  const [reparentingGenreUuid, setReparentingGenreUuid] = useState<string | null>(null);

  const { data: genrePlaylists, isPending: isListingGenrePlaylists } = useListFullGenrePlaylists(
    scope,
    getBackendBaseUrl,
  );
  const loadTreeMutation = useLoadExampleTreeGenre(scope, getBackendBaseUrl);
  const isLoadingTree = loadTreeMutation.isPending;

  const groupedGenrePlaylistsByRoot = useMemo(
    () =>
      genrePlaylists?.results ? getGenrePlaylistsGroupedByRoot(genrePlaylists.results as CriteriaPlaylistSimple[]) : {},
    [genrePlaylists?.results],
  );

  const isLoading = isListingGenrePlaylists || isLoadingTree;

  const loadButtonText = scope === "me" ? "Load the example tree genre" : "Load the reference tree genre";

  const actions = (
    <>
      <IconTextButton icon={Plus} text="Add root" onClick={() => handleGenreCreationAction(null)} />
      <IconTextButton
        icon={FaTree}
        text={loadButtonText}
        className="ml-2"
        onClick={() => loadTreeMutation.mutate()}
        disabled={isLoading}
      />
    </>
  );

  return (
    <div className="mt-4 flex flex-col h-screen">
      <div className="actions-container flex justify-start">
        <div className="flex justify-start">{actions}</div>
      </div>
      {isLoading ? (
        <GenreTreeSkeleton />
      ) : (
        <div className="tree-container flex flex-col gap-4 text-gray-800 w-full overflow-x-auto overflow-y-auto relative">
          {Object.entries(groupedGenrePlaylistsByRoot).map(([uuid, genrePlaylistTreePerRoot]) => {
            return (
              <div
                key={uuid}
                className="tree-per-root-container relative mt-2 mr-16 p-2 bg-gray-50 rounded-lg inline-block w-fit"
              >
                <div className="graph-container relative z-10">
                  <GenrePlaylistTreePerRoot
                    scope={scope}
                    rootUuid={uuid}
                    genrePlaylistTreePerRoot={genrePlaylistTreePerRoot}
                    reparentingGenreUuid={reparentingGenreUuid}
                    setReparentingGenreUuid={setReparentingGenreUuid}
                    handleGenreCreationAction={handleGenreCreationAction}
                    handleGenreRenameAction={handleGenreRenameAction}
                    getBackendBaseUrl={getBackendBaseUrl}
                    uploadTimeoutMs={uploadTimeoutMs}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
