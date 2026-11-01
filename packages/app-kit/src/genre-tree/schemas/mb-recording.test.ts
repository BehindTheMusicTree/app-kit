import { describe, it, expect } from "vitest";

import { MbRecordingDetailedSchema } from "./mb-recording";

const base = {
  musicbrainzId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  title: "Song",
  score: 100,
  musicbrainzArtists: [],
  musicbrainzLink: "https://musicbrainz.org/recording/3f2504e0-4f89-11d3-9a0c-0305e82c3301",
};

describe("MbRecordingDetailedSchema releaseDate", () => {
  it("normalizes a parseable date to ISO", () => {
    const parsed = MbRecordingDetailedSchema.parse({ ...base, releaseDate: "2020-05-01" });

    expect(parsed.releaseDate).toBe("2020-05-01T00:00:00.000Z");
  });

  it("falls back to a valid datetime for an unparseable date", () => {
    const parsed = MbRecordingDetailedSchema.parse({ ...base, releaseDate: "not-a-date" });

    expect(Number.isNaN(new Date(parsed.releaseDate as string).getTime())).toBe(false);
  });
});
