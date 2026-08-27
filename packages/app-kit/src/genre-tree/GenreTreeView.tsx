"use client";

import { useState, useMemo } from "react";
import { z } from "zod";
import { FaTree } from "react-icons/fa";
import { Plus } from "lucide-react";
import { IconTextButton, Button } from "@behindthemusictree/ui";

import type { GenreTreeAction, GenreTreeNode } from "@behindthemusictree/genre-tree-view";

import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";
import { CriteriaMinimum } from "./schemas/criteria/minimum";
import { TrackBase } from "./schemas/track/base";
import { CriteriaPlaylistDetailedLike } from "./models/TrackListOrigin";
import { Scope } from "../transport/lib/scope";
import { useListFullGenrePlaylists } from "./useGenrePlaylist";
import { useLoadExampleTreeGenre } from "./useGenre";
import { getGenrePlaylistsGroupedByRoot, hasMainstreamPopRoot } from "./lib/genre-playlist-helpers";

import GenrePlaylistTreePerRoot from "./playlist-tree/TreePerRoot";
import GenrePlaylistTreeWheel from "./playlist-tree/TreeWheel";
import GenrePlaylistTreeWheelRadialPopCore from "./playlist-tree/TreeWheelRadialPopCore";
import { GenreTreeSkeleton } from "./GenreTreeSkeleton";

export type GenreTreeViewMode = "stacked" | "wheel" | "pop-core";

export type GenreTreeViewProps<T extends TrackBase> = {
  scope: Scope;
  handleGenreCreationAction: (parent: CriteriaMinimum | null) => void;
  handleGenreRenameAction: (genre: CriteriaMinimum) => void;
  getBackendBaseUrl: () => string;
  criteriaPlaylistDetailedSchema: z.ZodType<CriteriaPlaylistDetailedLike<T>>;
  additionalActions?: (node: GenreTreeNode) => GenreTreeAction[];
  /** Controlled view mode. When provided, the internal Stacked/Wheel toggle is not rendered — the consumer owns that UI. */
  viewMode?: GenreTreeViewMode;
  /** When true, hides the "Add root" and load-tree buttons and suppresses per-node
   * create/rename/reparent affordances, for a read-only consumer. Defaults to false. */
  readOnly?: boolean;
};

export function GenreTreeView<T extends TrackBase>({
  scope,
  handleGenreCreationAction,
  handleGenreRenameAction,
  getBackendBaseUrl,
  criteriaPlaylistDetailedSchema,
  additionalActions,
  viewMode: controlledViewMode,
  readOnly = false,
}: GenreTreeViewProps<T>) {
  const [reparentingGenreUuid, setReparentingGenreUuid] = useState<string | null>(null);
  const [internalViewMode, setInternalViewMode] = useState<GenreTreeViewMode>("stacked");
  const isControlled = controlledViewMode !== undefined;
  const viewMode = controlledViewMode ?? internalViewMode;

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

  const canShowPopCore = useMemo(
    () =>
      hasMainstreamPopRoot(
        (genrePlaylists?.results ?? []).map((genrePlaylist) => ({
          id: genrePlaylist.uuid,
          parentId: genrePlaylist.parent?.uuid ?? null,
          name: genrePlaylist.name,
          itemCount: genrePlaylist.tracksCount,
        })),
      ),
    [genrePlaylists?.results],
  );

  const loadButtonText = scope === "me" ? "Load the example tree genre" : "Load the reference tree genre";

  const actions = (
    <>
      {!isLoading && !isControlled && (
        <div className="flex items-center gap-1 mr-2" role="group" aria-label="Tree view mode">
          <Button
            variant={viewMode === "stacked" ? "default" : "outline"}
            size="sm"
            onClick={() => setInternalViewMode("stacked")}
          >
            Stacked
          </Button>
          <Button
            variant={viewMode === "wheel" ? "default" : "outline"}
            size="sm"
            onClick={() => setInternalViewMode("wheel")}
          >
            Wheel
          </Button>
          <Button
            variant={viewMode === "pop-core" ? "default" : "outline"}
            size="sm"
            disabled={!canShowPopCore}
            title={canShowPopCore ? undefined : "This genre tree has no 'Mainstream Pop' root yet"}
            onClick={() => setInternalViewMode("pop-core")}
          >
            Pop/Core
          </Button>
        </div>
      )}
      {!isLoading && !readOnly && (
        <IconTextButton icon={Plus} text="Add root" onClick={() => handleGenreCreationAction(null)} />
      )}
      {!isLoading && !readOnly && !hasAtLeastOneGenre && (
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
            criteriaPlaylistDetailedSchema={criteriaPlaylistDetailedSchema}
            additionalActions={additionalActions}
            readOnly={readOnly}
          />
        </div>
      ) : viewMode === "pop-core" ? (
        <div className="tree-container flex-1 min-h-0 w-full relative">
          <GenrePlaylistTreeWheelRadialPopCore
            scope={scope}
            genrePlaylists={(genrePlaylists?.results ?? []) as CriteriaPlaylistSimple[]}
            reparentingGenreUuid={reparentingGenreUuid}
            setReparentingGenreUuid={setReparentingGenreUuid}
            handleGenreCreationAction={handleGenreCreationAction}
            handleGenreRenameAction={handleGenreRenameAction}
            getBackendBaseUrl={getBackendBaseUrl}
            criteriaPlaylistDetailedSchema={criteriaPlaylistDetailedSchema}
            additionalActions={additionalActions}
            readOnly={readOnly}
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
                    criteriaPlaylistDetailedSchema={criteriaPlaylistDetailedSchema}
                    additionalActions={additionalActions}
                    readOnly={readOnly}
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
