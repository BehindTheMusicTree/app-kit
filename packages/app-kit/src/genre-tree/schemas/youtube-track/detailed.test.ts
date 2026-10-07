import { describe, it, expect } from "vitest";

import { YoutubeTrackDetailedSchema, musicBrainzRecordingUrl, unplayableReasonLabel } from "./detailed";

const uuid = "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d";

const validYoutubeTrack = {
  uuid,
  title: "Karma Police",
  genre: { uuid, name: "Rock" },
  playlists: [],
  playCount: 0,
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

  it("defaults youtubeUnplayableReason to null when the key is absent", () => {
    expect(YoutubeTrackDetailedSchema.parse(validYoutubeTrack).youtubeUnplayableReason).toBeNull();
  });

  it("parses a known unplayable reason and rejects an unknown one", () => {
    const parsed = YoutubeTrackDetailedSchema.parse({ ...validYoutubeTrack, youtubeUnplayableReason: "not_embeddable" });
    expect(parsed.youtubeUnplayableReason).toBe("not_embeddable");
    expect(() => YoutubeTrackDetailedSchema.parse({ ...validYoutubeTrack, youtubeUnplayableReason: "nope" })).toThrow();
  });

  it("parses musicbrainzRecordingId, defaulting to null when absent and rejecting a non-uuid", () => {
    expect(YoutubeTrackDetailedSchema.parse(validYoutubeTrack).musicbrainzRecordingId).toBeNull();
    expect(YoutubeTrackDetailedSchema.parse({ ...validYoutubeTrack, musicbrainzRecordingId: null }).musicbrainzRecordingId).toBeNull();
    expect(YoutubeTrackDetailedSchema.parse({ ...validYoutubeTrack, musicbrainzRecordingId: uuid }).musicbrainzRecordingId).toBe(uuid);
    expect(() => YoutubeTrackDetailedSchema.parse({ ...validYoutubeTrack, musicbrainzRecordingId: "nope" })).toThrow();
  });
});

describe("musicBrainzRecordingUrl", () => {
  it("returns the recording URL when an MBID is present and null otherwise", () => {
    expect(musicBrainzRecordingUrl({ musicbrainzRecordingId: uuid })).toBe(`https://musicbrainz.org/recording/${uuid}`);
    expect(musicBrainzRecordingUrl({ musicbrainzRecordingId: null })).toBeNull();
    expect(musicBrainzRecordingUrl({ title: "audio track" })).toBeNull();
  });
});

describe("unplayableReasonLabel", () => {
  it("returns the label for a flagged track and null otherwise", () => {
    expect(unplayableReasonLabel({ youtubeUnplayableReason: "region_whitelisted" })).toBe("Region restricted");
    expect(unplayableReasonLabel({ youtubeUnplayableReason: null })).toBeNull();
    expect(unplayableReasonLabel({ title: "audio track" })).toBeNull();
  });
});
