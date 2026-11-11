import { describe, it, expect } from "vitest";

import { toArtistUuid, toGenreUuid, toSongUuid } from "./ids";

const uuid = "3f0d7b1e-8a3c-4d57-9a53-2b7f4f9c0a11";

describe.each([
  ["toGenreUuid", toGenreUuid],
  ["toArtistUuid", toArtistUuid],
  ["toSongUuid", toSongUuid],
])("%s", (_name, parse) => {
  it("returns a well-formed uuid", () => {
    expect(parse(uuid)).toBe(uuid);
  });

  it.each([[null], [""], ["not-a-uuid"]])("returns null for %j", (value) => {
    expect(parse(value)).toBeNull();
  });
});
