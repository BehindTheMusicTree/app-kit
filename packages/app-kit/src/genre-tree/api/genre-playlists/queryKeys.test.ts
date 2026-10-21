import { describe, it, expect } from "vitest";

import { genrePlaylistQueryKeys } from "./queryKeys";

describe("genrePlaylistQueryKeys", () => {
  it("builds me-scope keys", () => {
    expect(genrePlaylistQueryKeys.me.list(2)).toEqual(["meGenrePlaylists", "list", 2]);
    expect(genrePlaylistQueryKeys.me.detail("u")).toEqual(["meGenrePlaylists", "u"]);
    expect(genrePlaylistQueryKeys.me.tracks("u")).toEqual(["meGenrePlaylists", "u", "tracks"]);
  });

  it("threads the base URL into reference-scope keys", () => {
    expect(genrePlaylistQueryKeys.reference.list("https://b", 1)).toEqual([
      "referenceGenrePlaylists",
      "https://b",
      "list",
      1,
    ]);
    expect(genrePlaylistQueryKeys.reference.full("https://b")).toEqual(["referenceGenrePlaylists", "https://b", "full"]);
    expect(genrePlaylistQueryKeys.reference.detail("https://b", "u")).toEqual([
      "referenceGenrePlaylists",
      "https://b",
      "u",
    ]);
  });
});
