import { describe, expect, it } from "vitest";

import { ArtistDetailedSchema } from "./artist-detailed";
import { HttpUrlSchema } from "./http-url";

describe("HttpUrlSchema", () => {
  it.each(["http://example.org/a", "https://example.org/a?b=1"])("accepts %s", (url) => {
    expect(HttpUrlSchema.safeParse(url).success).toBe(true);
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "ftp://example.org/a", "example.org"])(
    "rejects %s",
    (url) => {
      expect(HttpUrlSchema.safeParse(url).success).toBe(false);
    },
  );
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
