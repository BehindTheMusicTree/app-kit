import { describe, it, expect } from "vitest";
import { getReparentCandidates } from "./reparent-candidates";
import { CriteriaPlaylistSimple } from "../schemas/criteria-playlist/simple";
import { makeGenrePlaylistUuid, makeGenreUuid } from "../testing";

const makeGenrePlaylist = (uuid: string, parentUuid: string | null): CriteriaPlaylistSimple => ({
  uuid: makeGenrePlaylistUuid(uuid),
  name: uuid,
  criteria: { uuid: makeGenreUuid(`c-${uuid}`), name: uuid },
  parent: parentUuid ? { uuid: makeGenrePlaylistUuid(parentUuid), name: parentUuid } : null,
  root: { uuid: makeGenrePlaylistUuid("root"), name: "root" },
  tracksCount: 0,
  viewsCount: 0,
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
    expect(getReparentCandidates(genrePlaylists, makeGenrePlaylistUuid("rock")).map((g) => g.uuid)).toEqual([
      makeGenrePlaylistUuid("jazz"),
    ]);
  });

  it("keeps siblings and ancestors other than the current parent", () => {
    expect(getReparentCandidates(genrePlaylists, makeGenrePlaylistUuid("hardcore")).map((g) => g.uuid)).toEqual([
      makeGenrePlaylistUuid("root"),
      makeGenrePlaylistUuid("rock"),
      makeGenrePlaylistUuid("jazz"),
    ]);
  });

  it("does not loop on a parent cycle", () => {
    const cyclic = [makeGenrePlaylist("a", "b"), makeGenrePlaylist("b", "a"), makeGenrePlaylist("c", null)];
    expect(getReparentCandidates(cyclic, makeGenrePlaylistUuid("c")).map((g) => g.uuid)).toEqual([
      makeGenrePlaylistUuid("a"),
      makeGenrePlaylistUuid("b"),
    ]);
  });

  it("excludes the criteria-less Genreless root, which has no genre to reparent under", () => {
    const genreless = { ...makeGenrePlaylist("genreless", null), criteria: null };
    expect(
      getReparentCandidates([...genrePlaylists, genreless], makeGenrePlaylistUuid("jazz")).map((g) => g.uuid),
    ).toEqual([makeGenrePlaylistUuid("rock"), makeGenrePlaylistUuid("punk"), makeGenrePlaylistUuid("hardcore")]);
  });
});
