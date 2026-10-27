import { describe, it, expect } from "vitest";
import { getReparentCandidates } from "./reparent-candidates";
import { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";

const makeGenrePlaylist = (uuid: string, parentUuid: string | null): CriteriaPlaylistSimple => ({
  uuid,
  name: uuid,
  criteria: null,
  parent: parentUuid ? { uuid: parentUuid, name: parentUuid } : null,
  root: { uuid: "root", name: "root" },
  tracksCount: 0,
  createdOn: "2026-01-01T00:00:00Z",
  updatedOn: null,
  isUnacceptedRoot: false,
});

describe("getReparentCandidates", () => {
  const genrePlaylists = [
    makeGenrePlaylist("root", null),
    makeGenrePlaylist("rock", "root"),
    makeGenrePlaylist("punk", "rock"),
    makeGenrePlaylist("hardcore", "punk"),
    makeGenrePlaylist("jazz", "root"),
  ];

  it("excludes the genre, its current parent and all its descendants", () => {
    expect(getReparentCandidates(genrePlaylists, "rock").map((g) => g.uuid)).toEqual(["jazz"]);
  });

  it("keeps siblings and ancestors other than the current parent", () => {
    expect(getReparentCandidates(genrePlaylists, "hardcore").map((g) => g.uuid)).toEqual(["root", "rock", "jazz"]);
  });

  it("does not loop on a parent cycle", () => {
    const cyclic = [makeGenrePlaylist("a", "b"), makeGenrePlaylist("b", "a"), makeGenrePlaylist("c", null)];
    expect(getReparentCandidates(cyclic, "c").map((g) => g.uuid)).toEqual(["a", "b"]);
  });
});
