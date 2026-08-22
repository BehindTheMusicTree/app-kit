"use client";

import { useState, useMemo } from "react";
import { FaTree } from "react-icons/fa";
import { Plus } from "lucide-react";
import { IconTextButton, Button } from "@behindthemusictree/ui";

import type { GenreTreeAction, GenreTreeNode } from "@behindthemusictree/genre-tree-view";

import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";
import { CriteriaMinimum } from "./schemas/criteria/minimum";
import { Scope } from "../transport/lib/scope";
import { useListFullGenrePlaylists } from "./useGenrePlaylist";
import { useLoadExampleTreeGenre } from "./useGenre";
import { getGenrePlaylistsGroupedByRoot } from "./lib/genre-playlist-helpers";

import GenrePlaylistTreePerRoot from "./playlist-tree/TreePerRoot";
import GenrePlaylistTreeWheel from "./playlist-tree/TreeWheel";
import { GenreTreeSkeleton } from "./GenreTreeSkeleton";

type GenreTreeViewMode = "stacked" | "wheel";

export type GenreTreeViewProps = {
  scope: Scope;
  handleGenreCreationAction: (parent: CriteriaMinimum | null) => void;
  handleGenreRenameAction: (genre: CriteriaMinimum) => void;
  getBackendBaseUrl: () => string;
  additionalActions?: (node: GenreTreeNode) => GenreTreeAction[];
};

export function GenreTreeView({
  scope,
  handleGenreCreationAction,
  handleGenreRenameAction,
  getBackendBaseUrl,
  additionalActions,
}: GenreTreeViewProps) {
  const [reparentingGenreUuid, setReparentingGenreUuid] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<GenreTreeViewMode>("stacked");

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
  const hasAtLeastOneGenre = Object.keys(groupedGenrePlaylistsByRoot).length > 0;

  const loadButtonText = scope === "me" ? "Load the example tree genre" : "Load the reference tree genre";

  const actions = (
    <>
      {!isLoading && (
        <div className="flex items-center gap-1 mr-2" role="group" aria-label="Tree view mode">
          <Button
            variant={viewMode === "stacked" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("stacked")}
          >
            Stacked
          </Button>
          <Button variant={viewMode === "wheel" ? "default" : "outline"} size="sm" onClick={() => setViewMode("wheel")}>
            Wheel
          </Button>
        </div>
      )}
      {!isLoading && (
        <IconTextButton icon={Plus} text="Add root" onClick={() => handleGenreCreationAction(null)} />
      )}
      {!isLoading && !hasAtLeastOneGenre && (
        <IconTextButton
          icon={FaTree}
          text={loadButtonText}
          className="ml-2"
          onClick={() => loadTreeMutation.mutate()}
        />
      )}
    </>
  );

  return (
    <div className="mt-4 flex flex-col h-full">
      <div className="actions-container flex justify-start">
        <div className="flex justify-start">{actions}</div>
      </div>
      {isLoading ? (
        <GenreTreeSkeleton />
      ) : viewMode === "wheel" ? (
        <div className="tree-container flex-1 min-h-0 w-full relative">
          <GenrePlaylistTreeWheel
            scope={scope}
            genrePlaylists={(genrePlaylists?.results ?? []) as CriteriaPlaylistSimple[]}
            reparentingGenreUuid={reparentingGenreUuid}
            setReparentingGenreUuid={setReparentingGenreUuid}
            handleGenreCreationAction={handleGenreCreationAction}
            handleGenreRenameAction={handleGenreRenameAction}
            getBackendBaseUrl={getBackendBaseUrl}
            additionalActions={additionalActions}
          />
        </div>
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
                    additionalActions={additionalActions}
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
