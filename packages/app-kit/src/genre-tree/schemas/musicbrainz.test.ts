import { describe, it, expect } from "vitest";

import { MbArtistDetailedSchema } from "./mb-artist";
import { MbRecordingDetailedSchema } from "./mb-recording";

const musicbrainzId = "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d";

const validArtist = {
  musicbrainzId,
  name: "Radiohead",
  musicbrainzLink: "https://musicbrainz.org/artist/b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d",
};

describe("MbArtistDetailedSchema", () => {
  it("parses a valid artist", () => {
    expect(() => MbArtistDetailedSchema.parse(validArtist)).not.toThrow();
  });

  it("rejects an invalid musicbrainzId", () => {
    expect(() => MbArtistDetailedSchema.parse({ ...validArtist, musicbrainzId: "not-a-uuid" })).toThrow();
  });
});

describe("MbRecordingDetailedSchema", () => {
  const validRecording = {
    musicbrainzId,
    title: "Karma Police",
    score: 100,
    musicbrainzArtists: [validArtist],
    musicbrainzLink: "https://musicbrainz.org/recording/b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d",
    durationInSec: 264,
    durationStrInHourMinSec: "00:04:24",
    releaseDate: "1997-05-21T00:00:00.000Z",
  };

  it("parses a valid recording and normalizes releaseDate to an ISO string", () => {
    const parsed = MbRecordingDetailedSchema.parse(validRecording);
    expect(parsed.releaseDate).toBe(new Date(validRecording.releaseDate).toISOString());
  });

  it("falls back to now when releaseDate is an unparseable string", () => {
    const parsed = MbRecordingDetailedSchema.parse({ ...validRecording, releaseDate: "not-a-date" });
    expect(() => new Date(parsed.releaseDate)).not.toThrow();
    expect(isNaN(new Date(parsed.releaseDate).getTime())).toBe(false);
  });

  it("accepts null/omitted duration fields", () => {
    const { durationInSec: _durationInSec, durationStrInHourMinSec: _durationStrInHourMinSec, ...rest } =
      validRecording;
    expect(() => MbRecordingDetailedSchema.parse(rest)).not.toThrow();
  });

  it("rejects a shape missing a required field", () => {
    const { title: _title, ...invalid } = validRecording;
    expect(() => MbRecordingDetailedSchema.parse(invalid)).toThrow();
  });
});
