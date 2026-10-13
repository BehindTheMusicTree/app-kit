import { describe, it, expect } from "vitest";

import { makeTrackPlaylistRelPageSchema } from "../track-playlist-rel/without-playlist";
import {
  NO_VIDEO_LABEL,
  RecordingDetailed,
  RecordingDetailedSchema,
  isRecording,
  musicBrainzRecordingUrl,
  recordingUnplayableReason,
} from "./detailed";

const uuid = "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d";

const withVideo = {
  uuid,
  title: "Karma Police",
  genre: { uuid, name: "Rock" },
  playlists: [],
  playCount: 0,
  createdOn: "2024-01-01T00:00:00.000Z",
  youtubeVideo: { id: "abc123", unplayableReason: null },
  musicbrainzRecordingId: uuid,
};

const withoutVideo = { ...withVideo, title: "Lucky", youtubeVideo: null, musicbrainzRecordingId: null };

const makeRecording = (youtubeVideo: RecordingDetailed["youtubeVideo"]): RecordingDetailed =>
  RecordingDetailedSchema.parse({ ...withVideo, youtubeVideo });

describe("RecordingDetailedSchema", () => {
  it("parses a recording with a video", () => {
    const parsed = RecordingDetailedSchema.parse(withVideo);
    expect(parsed.youtubeVideo).toEqual({ id: "abc123", unplayableReason: null });
    expect(parsed.musicbrainzRecordingId).toBe(uuid);
    expect(parsed).not.toHaveProperty("kind");
  });

  it("parses a recording without a video", () => {
    expect(RecordingDetailedSchema.parse(withoutVideo).youtubeVideo).toBeNull();
  });

  it("parses a mixed page of recordings with and without a video", () => {
    const page = {
      overallTotal: 2,
      next: null,
      previous: null,
      results: [
        { track: withVideo, position: 0 },
        { track: withoutVideo, position: 1 },
      ],
      page: 1,
      pageSize: 100,
      totalPages: 1,
    };
    const parsed = makeTrackPlaylistRelPageSchema(RecordingDetailedSchema).parse(page);
    expect(parsed.results.map((rel) => rel.track.youtubeVideo?.id ?? null)).toEqual(["abc123", null]);
  });

  it("rejects an unknown unplayable reason and a non-uuid MBID", () => {
    expect(() =>
      RecordingDetailedSchema.parse({ ...withVideo, youtubeVideo: { id: "abc123", unplayableReason: "nope" } }),
    ).toThrow();
    expect(() => RecordingDetailedSchema.parse({ ...withVideo, musicbrainzRecordingId: "nope" })).toThrow();
  });
});

describe("recordingUnplayableReason", () => {
  it("labels a recording without a video", () => {
    expect(recordingUnplayableReason(makeRecording(null))).toBe(NO_VIDEO_LABEL);
  });

  it("labels a flagged video", () => {
    expect(recordingUnplayableReason(makeRecording({ id: "abc123", unplayableReason: "region_whitelisted" }))).toBe(
      "Region restricted",
    );
  });

  it("returns null for a playable recording", () => {
    expect(recordingUnplayableReason(makeRecording({ id: "abc123", unplayableReason: null }))).toBeNull();
  });
});

describe("isRecording", () => {
  it("tells recordings apart from other track kinds", () => {
    expect(isRecording(RecordingDetailedSchema.parse(withoutVideo))).toBe(true);
    const { youtubeVideo: _youtubeVideo, ...uploaded } = withVideo;
    expect(isRecording(uploaded)).toBe(false);
  });
});

describe("musicBrainzRecordingUrl", () => {
  it("returns the recording URL when an MBID is present and null otherwise", () => {
    expect(musicBrainzRecordingUrl(RecordingDetailedSchema.parse(withVideo))).toBe(
      `https://musicbrainz.org/recording/${uuid}`,
    );
    expect(musicBrainzRecordingUrl(RecordingDetailedSchema.parse(withoutVideo))).toBeNull();
  });
});
