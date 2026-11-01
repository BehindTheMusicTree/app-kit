import { describe, it, expect } from "vitest";

import { editGenreSongPages } from "./genre-songs-cache";

const data = {
  pages: [
    { tracks: [{ uuid: "a" }, { uuid: "b" }], total: 3, nextPage: "c" },
    { tracks: [{ uuid: "c" }], total: 3, nextPage: null },
  ],
  pageParams: ["", "c"],
};

describe("editGenreSongPages", () => {
  it("returns undefined when nothing is cached", () => {
    expect(editGenreSongPages(undefined, (tracks) => tracks)).toBeUndefined();
  });

  it("removes tracks and lowers total by the removed count", () => {
    const result = editGenreSongPages(data, (tracks) => tracks.filter((t) => t.uuid !== "b"));
    expect(result?.pages.map((p) => p.tracks.map((t) => t.uuid))).toEqual([["a"], ["c"]]);
    expect(result?.pages.map((p) => p.total)).toEqual([2, 2]);
    const onPage2 = editGenreSongPages(data, (tracks) => tracks.filter((t) => t.uuid !== "c"));
    expect(onPage2?.pages.map((p) => p.total)).toEqual([2, 2]);
    expect(result?.pageParams).toBe(data.pageParams);
  });

  it("keeps a null total", () => {
    const result = editGenreSongPages({ ...data, pages: [{ tracks: [{ uuid: "a" }], total: null, nextPage: null }] }, () => []);
    expect(result?.pages[0].total).toBeNull();
  });
});
