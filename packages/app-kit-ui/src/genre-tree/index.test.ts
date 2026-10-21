import { describe, it, expect } from "vitest";

import * as genreTree from "./index";

describe("genre-tree barrel", () => {
  it("re-exports the styled tree components and skeletons", () => {
    expect(genreTree.GenreTreeView).toBeTypeOf("function");
    expect(genreTree.GenreTreeSkeleton).toBeTypeOf("function");
    expect(genreTree.GenrePlaylistTreePerRoot).toBeTypeOf("function");
    expect(genreTree.GenreSearch).toBeTypeOf("function");
  });

  it("re-exports track-list components", () => {
    expect(genreTree.TrackListSidebar).toBeTypeOf("function");
    expect(genreTree.TrackItem).toBeTypeOf("function");
    expect(genreTree.TrackPositionPlayPause).toBeTypeOf("function");
    expect(genreTree.Rating).toBeTypeOf("function");
  });
});
