import { describe, it, expect } from "vitest";

import { makeTrackPlaylistRelPageSchema } from "../track-playlist-rel/without-playlist";
import {
  NO_VIDEO_LABEL,
  SongDetailed,
  SongDetailedSchema,
  isSong,
  musicBrainzRecordingUrl,
  songUnplayableReason,
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

const makeSong = (youtubeVideo: SongDetailed["youtubeVideo"]): SongDetailed =>
  SongDetailedSchema.parse({ ...withVideo, youtubeVideo });

describe("SongDetailedSchema", () => {
  it("parses a song with a video", () => {
    const parsed = SongDetailedSchema.parse(withVideo);
    expect(parsed.youtubeVideo).toEqual({ id: "abc123", unplayableReason: null });
    expect(parsed.musicbrainzRecordingId).toBe(uuid);
    expect(parsed).not.toHaveProperty("kind");
  });

  it("parses a song without a video", () => {
    expect(SongDetailedSchema.parse(withoutVideo).youtubeVideo).toBeNull();
  });

  it("parses a mixed page of songs with and without a video", () => {
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
    const parsed = makeTrackPlaylistRelPageSchema(SongDetailedSchema).parse(page);
    expect(parsed.results.map((rel) => rel.track.youtubeVideo?.id ?? null)).toEqual(["abc123", null]);
  });

  it("rejects an unknown unplayable reason and a non-uuid MBID", () => {
    expect(() =>
      SongDetailedSchema.parse({ ...withVideo, youtubeVideo: { id: "abc123", unplayableReason: "nope" } }),
    ).toThrow();
    expect(() => SongDetailedSchema.parse({ ...withVideo, musicbrainzRecordingId: "nope" })).toThrow();
  });
});

describe("songUnplayableReason", () => {
  it("labels a song without a video", () => {
    expect(songUnplayableReason(makeSong(null))).toBe(NO_VIDEO_LABEL);
  });

  it("labels a flagged video", () => {
    expect(songUnplayableReason(makeSong({ id: "abc123", unplayableReason: "region_whitelisted" }))).toBe(
      "Region restricted",
    );
  });

  it("returns null for a playable song", () => {
    expect(songUnplayableReason(makeSong({ id: "abc123", unplayableReason: null }))).toBeNull();
  });
});

describe("isSong", () => {
  it("tells songs apart from other track kinds", () => {
    expect(isSong(SongDetailedSchema.parse(withoutVideo))).toBe(true);
    const { youtubeVideo: _youtubeVideo, ...uploaded } = withVideo;
    expect(isSong(uploaded)).toBe(false);
  });
});

describe("musicBrainzRecordingUrl", () => {
  it("returns the song URL when an MBID is present and null otherwise", () => {
    expect(musicBrainzRecordingUrl(SongDetailedSchema.parse(withVideo))).toBe(
      `https://musicbrainz.org/recording/${uuid}`,
    );
    expect(musicBrainzRecordingUrl(SongDetailedSchema.parse(withoutVideo))).toBeNull();
  });
});
