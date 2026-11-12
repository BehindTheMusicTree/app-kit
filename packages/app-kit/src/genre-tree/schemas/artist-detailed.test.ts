import { describe, expect, it } from "vitest";

import { ArtistOriginSchema } from "./artist-detailed";

const origin = {
  name: "Liverpool",
  kind: "city",
  source: "begin_area",
  wikidataId: "Q24826",
  longitude: -2.99,
  latitude: 53.41,
  regionId: "Q23",
};

describe("ArtistOriginSchema", () => {
  it("accepts an origin whose area has no type", () => {
    expect(ArtistOriginSchema.safeParse({ ...origin, kind: null }).success).toBe(true);
  });

  it("rejects an origin without a kind key", () => {
    const { kind: _kind, ...withoutKind } = origin;

    expect(ArtistOriginSchema.safeParse(withoutKind).success).toBe(false);
  });
});
