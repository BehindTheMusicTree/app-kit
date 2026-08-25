import { describe, it, expect } from "vitest";

import { YoutubeTrackDetailedSchema } from "./detailed";

const uuid = "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d";

const validYoutubeTrack = {
  uuid,
  title: "Karma Police",
  genre: { uuid, name: "Rock" },
  playlists: [],
  playCount: 0,
  archived: false,
  createdOn: "2024-01-01T00:00:00.000Z",
  youtubeVideoId: "abc123",
};

describe("YoutubeTrackDetailedSchema", () => {
  it("parses a valid youtube track and stamps kind: 'youtube'", () => {
    const parsed = YoutubeTrackDetailedSchema.parse(validYoutubeTrack);
    expect(parsed.kind).toBe("youtube");
    expect(parsed.youtubeVideoId).toBe("abc123");
  });

  it("rejects a shape missing youtubeVideoId", () => {
    const { youtubeVideoId: _youtubeVideoId, ...invalid } = validYoutubeTrack;
    expect(() => YoutubeTrackDetailedSchema.parse(invalid)).toThrow();
  });
});
