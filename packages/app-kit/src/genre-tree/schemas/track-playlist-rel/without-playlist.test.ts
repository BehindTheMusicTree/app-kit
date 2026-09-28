import { describe, it, expect } from "vitest";
import { z } from "zod";

import { makeTrackPlaylistRelPageSchema, makeTrackPlaylistRelSchema } from "./without-playlist";

const trackSchema = z.object({ uuid: z.string().uuid() });
const TrackPlaylistRelSchema = makeTrackPlaylistRelSchema(trackSchema);

describe("makeTrackPlaylistRelSchema", () => {
  it("parses a valid track/position pair", () => {
    const valid = { track: { uuid: "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d" }, position: 0 };
    expect(() => TrackPlaylistRelSchema.parse(valid)).not.toThrow();
  });

  it("rejects a negative position", () => {
    const invalid = { track: { uuid: "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d" }, position: -1 };
    expect(() => TrackPlaylistRelSchema.parse(invalid)).toThrow();
  });
});

describe("makeTrackPlaylistRelPageSchema", () => {
  it("parses a paginated page of track/position pairs", () => {
    const page = {
      overallTotal: 1,
      next: null,
      previous: null,
      results: [{ track: { uuid: "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d" }, position: 1 }],
      page: 1,
      pageSize: 100,
      totalPages: 1,
    };
    expect(makeTrackPlaylistRelPageSchema(trackSchema).parse(page).results[0].position).toBe(1);
  });
});
