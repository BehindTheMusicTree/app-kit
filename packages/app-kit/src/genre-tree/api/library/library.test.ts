import { describe, it, expect } from "vitest";

import { libraryEndpoints, libraryQueryKeys } from "./index";

describe("libraryEndpoints", () => {
  it("exposes reference.songs endpoints", () => {
    expect(libraryEndpoints.reference.songs.list()).toBe("library/songs/");
  });
});

describe("libraryQueryKeys", () => {
  it("exposes reference.songs query keys", () => {
    expect(libraryQueryKeys.reference.songs.all).toEqual(["referenceSongs"]);
  });
});
