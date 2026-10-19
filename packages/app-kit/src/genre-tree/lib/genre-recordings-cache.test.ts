import { describe, it, expect } from "vitest";

import { editGenreRecordingPages } from "./genre-recordings-cache";

const data = {
  pages: [
    { tracks: [{ uuid: "a" }, { uuid: "b" }], total: 3, nextPage: "c" },
    { tracks: [{ uuid: "c" }], total: 3, nextPage: null },
  ],
  pageParams: ["", "c"],
};

describe("editGenreRecordingPages", () => {
  it("returns undefined when nothing is cached", () => {
    expect(editGenreRecordingPages(undefined, (tracks) => tracks)).toBeUndefined();
  });

  it("removes tracks and lowers total by the removed count", () => {
    const result = editGenreRecordingPages(data, (tracks) => tracks.filter((t) => t.uuid !== "b"));
    expect(result?.pages.map((p) => p.tracks.map((t) => t.uuid))).toEqual([["a"], ["c"]]);
    expect(result?.pages.map((p) => p.total)).toEqual([2, 3]);
    expect(result?.pageParams).toBe(data.pageParams);
  });

  it("keeps a null total", () => {
    const result = editGenreRecordingPages({ ...data, pages: [{ tracks: [{ uuid: "a" }], total: null, nextPage: null }] }, () => []);
    expect(result?.pages[0].total).toBeNull();
  });
});
