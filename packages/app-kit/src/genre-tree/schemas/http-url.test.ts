import { describe, expect, it } from "vitest";

import { ArtistDetailedSchema } from "./artist-detailed";
import { CriteriaOverviewSchema } from "./criteria/overview";
import { HttpUrlSchema } from "./http-url";
import { MbArtistDetailedSchema } from "./mb-artist";
import { MbRecordingDetailedSchema } from "./mb-recording";

describe("HttpUrlSchema", () => {
  it.each(["http://example.org/a", "https://example.org/a?b=1", "http://localhost:8001/x"])("accepts %s", (url) => {
    expect(HttpUrlSchema.safeParse(url).success).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://example.org/a",
    "example.org",
    "http:foo",
    "https:foo",
    "http:/foo",
    "https://",
  ])("rejects %s", (url) => {
    expect(HttpUrlSchema.safeParse(url).success).toBe(false);
  });
});

describe("ArtistDetailedSchema URLs", () => {
  const artist = {
    uuid: "11111111-1111-4111-8111-111111111111",
    name: "Artist",
    musicbrainzArtistId: null,
    type: null,
    country: null,
    beginYear: null,
    endYear: null,
    ended: false,
    links: [{ kind: "official", url: "https://example.org/" }],
    members: [],
    memberOf: [],
    albums: [],
    tracksCount: 0,
    image: {
      url: "https://upload.wikimedia.org/a.jpg",
      pageUrl: "https://commons.wikimedia.org/wiki/File:a.jpg",
      author: null,
      license: "CC BY 4.0",
      licenseUrl: null,
    },
  };

  it("accepts http(s) links and image URLs", () => {
    expect(ArtistDetailedSchema.safeParse(artist).success).toBe(true);
  });

  it("rejects a non-http(s) link url", () => {
    const links = [{ kind: "official", url: "javascript:alert(1)" }];
    expect(ArtistDetailedSchema.safeParse({ ...artist, links }).success).toBe(false);
  });

  it.each(["url", "pageUrl", "licenseUrl"] as const)("rejects a non-http(s) image %s", (key) => {
    const image = { ...artist.image, [key]: "data:text/html,x" };
    expect(ArtistDetailedSchema.safeParse({ ...artist, image }).success).toBe(false);
  });
});

describe("rendered musicbrainz and summary source URLs", () => {
  const overview = {
    uuid: "11111111-1111-4111-8111-111111111111",
    name: "Jazz",
    summary: null,
    description: null,
    summarySourceUrl: "https://en.wikipedia.org/wiki/Jazz",
  };
  const mbArtist = {
    musicbrainzId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    name: "Artist",
    musicbrainzLink: "https://musicbrainz.org/artist/3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  };
  const mbRecording = {
    musicbrainzId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    title: "Song",
    score: 100,
    musicbrainzArtists: [],
    musicbrainzLink: "https://musicbrainz.org/recording/3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    releaseDate: "2020-05-01",
  };
  const cases = [
    ["CriteriaOverviewSchema.summarySourceUrl", CriteriaOverviewSchema, overview, "summarySourceUrl"],
    ["MbArtistDetailedSchema.musicbrainzLink", MbArtistDetailedSchema, mbArtist, "musicbrainzLink"],
    ["MbRecordingDetailedSchema.musicbrainzLink", MbRecordingDetailedSchema, mbRecording, "musicbrainzLink"],
  ] as const;

  describe.each(cases)("%s", (_name, schema, valid, key) => {
    it("accepts https", () => {
      expect(schema.safeParse(valid).success).toBe(true);
    });

    it.each(["javascript:alert(1)", "ftp://example.org/a"])("rejects %s", (url) => {
      expect(schema.safeParse({ ...valid, [key]: url }).success).toBe(false);
    });
  });

  it("keeps summarySourceUrl nullable", () => {
    expect(CriteriaOverviewSchema.safeParse({ ...overview, summarySourceUrl: null }).success).toBe(true);
  });
});
