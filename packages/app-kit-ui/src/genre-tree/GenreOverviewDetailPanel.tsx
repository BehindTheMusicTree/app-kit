"use client";

import { forwardRef, type ComponentProps } from "react";
import { DetailPanel } from "@behindthemusictree/ui";
import { useFetchGenreOverview, type CriteriaOverview, type GenreUuid } from "@behindthemusictree/app-kit/genre-tree";
import type { Scope } from "@behindthemusictree/app-kit/transport";
import type { z } from "zod";
import { CommonsCover } from "./CommonsPhoto";

type Props = ComponentProps<typeof DetailPanel> & {
  genreUuid: GenreUuid | null;
  scope: Scope;
  getBackendBaseUrl: () => string;
  criteriaOverviewSchema?: z.ZodType<CriteriaOverview, unknown>;
};

// Keep overview transitions inside the panel so loading a cover never rerenders the tree.
export const GenreOverviewDetailPanel = forwardRef<HTMLDivElement, Props>(function GenreOverviewDetailPanel(
  { genreUuid, scope, getBackendBaseUrl, criteriaOverviewSchema, cover, ...props }, ref,
) {
  const { data: overview } = useFetchGenreOverview(genreUuid, scope, getBackendBaseUrl, criteriaOverviewSchema);
  return (
    <DetailPanel {...props} ref={ref} cover={genreUuid && overview?.image ? <CommonsCover image={overview.image} alt={overview.name} creditLabel="Image" /> : cover} />
  );
});
