import { describe, it, expect } from "vitest";

import { libraryEndpoints, libraryQueryKeys } from "./index";

describe("libraryEndpoints", () => {
  it("exposes reference.recordings endpoints", () => {
    expect(libraryEndpoints.reference.recordings.list()).toBe("library/recordings/");
  });
});

describe("libraryQueryKeys", () => {
  it("exposes reference.recordings query keys", () => {
    expect(libraryQueryKeys.reference.recordings.all).toEqual(["referenceRecordings"]);
  });
});
