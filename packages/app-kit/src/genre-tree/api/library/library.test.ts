import { describe, it, expect } from "vitest";

import { libraryEndpoints, libraryQueryKeys } from "./index";

describe("libraryEndpoints", () => {
  it("exposes reference.youtube endpoints", () => {
    expect(libraryEndpoints.reference.youtube.list()).toBe("library/youtube/");
  });
});

describe("libraryQueryKeys", () => {
  it("exposes reference.youtube query keys", () => {
    expect(libraryQueryKeys.reference.youtube.all).toEqual(["referenceYoutubeTracks"]);
  });
});
