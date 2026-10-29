import { describe, it, expect } from "vitest";
import type { CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";
import { genrePlaylistSize, hasViewsCount } from "./size-metric";

const genrePlaylist = { tracksCount: 3, viewsCount: 900 } as CriteriaPlaylistSimple;

describe("genrePlaylistSize", () => {
  it("returns the song count for the songs metric", () => {
    expect(genrePlaylistSize(genrePlaylist, "songs")).toBe(3);
  });

  it("returns the summed views for the views metric", () => {
    expect(genrePlaylistSize(genrePlaylist, "views")).toBe(900);
  });

  it("throws for the views metric when the backend sent no viewsCount", () => {
    const withoutViews = { uuid: "gp1", tracksCount: 3 } as CriteriaPlaylistSimple;
    expect(() => genrePlaylistSize(withoutViews, "views")).toThrow(/gp1/);
  });
});

describe("hasViewsCount", () => {
  it("is true only when every playlist carries viewsCount", () => {
    const withoutViews = { tracksCount: 3 } as CriteriaPlaylistSimple;
    expect(hasViewsCount([genrePlaylist])).toBe(true);
    expect(hasViewsCount([genrePlaylist, withoutViews])).toBe(false);
  });
});
