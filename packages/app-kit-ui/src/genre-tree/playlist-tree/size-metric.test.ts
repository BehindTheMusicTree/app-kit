import { describe, it, expect } from "vitest";
import type { CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";
import { genrePlaylistSize } from "./size-metric";

const genrePlaylist = { tracksCount: 3, viewsCount: 900 } as CriteriaPlaylistSimple;

describe("genrePlaylistSize", () => {
  it("returns the song count for the songs metric", () => {
    expect(genrePlaylistSize(genrePlaylist, "songs")).toBe(3);
  });

  it("returns the summed views for the views metric", () => {
    expect(genrePlaylistSize(genrePlaylist, "views")).toBe(900);
  });
});
