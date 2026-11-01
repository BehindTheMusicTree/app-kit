import { describe, it, expect } from "vitest";

import * as trackNoun from "./index";

describe("track-noun barrel", () => {
  it("re-exports the package's public track-noun surface", () => {
    expect(trackNoun.TrackNounProvider).toBeTypeOf("function");
    expect(trackNoun.useTrackNoun).toBeTypeOf("function");
  });
});
