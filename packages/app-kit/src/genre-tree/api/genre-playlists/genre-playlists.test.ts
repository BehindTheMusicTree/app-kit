import { describe, it, expect } from "vitest";

import { genrePlaylistEndpoints } from "./endpoints";
import { genrePlaylistQueryKeys } from "./queryKeys";
import { genrePlaylistEndpoints as barrelEndpoints, genrePlaylistQueryKeys as barrelQueryKeys } from "./index";

const uuid = "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d";

describe("genrePlaylistEndpoints", () => {
  it("builds 'me' scope URLs with the 'me/' prefix", () => {
    expect(genrePlaylistEndpoints.me.list()).toBe("me/genre-playlists/");
    expect(genrePlaylistEndpoints.me.detail(uuid)).toBe(`me/genre-playlists/${uuid}/`);
    expect(genrePlaylistEndpoints.me.create()).toBe("me/genre-playlists/");
    expect(genrePlaylistEndpoints.me.update(uuid)).toBe(`me/genre-playlists/${uuid}/`);
    expect(genrePlaylistEndpoints.me.delete(uuid)).toBe(`me/genre-playlists/${uuid}/`);
  });

  it("builds 'reference' scope URLs with no prefix", () => {
    expect(genrePlaylistEndpoints.reference.list()).toBe("genre-playlists/");
    expect(genrePlaylistEndpoints.reference.detail(uuid)).toBe(`genre-playlists/${uuid}/`);
  });
});

describe("genrePlaylistQueryKeys", () => {
  it("builds 'me' scope query keys", () => {
    expect(genrePlaylistQueryKeys.me.all).toEqual(["meGenrePlaylists"]);
    expect(genrePlaylistQueryKeys.me.list(2)).toEqual(["meGenrePlaylists", "list", 2]);
    expect(genrePlaylistQueryKeys.me.full).toEqual(["meGenrePlaylists", "full"]);
    expect(genrePlaylistQueryKeys.me.detail(uuid)).toEqual(["meGenrePlaylists", uuid]);
  });

  it("builds 'reference' scope query keys", () => {
    expect(genrePlaylistQueryKeys.reference.all).toEqual(["referenceGenrePlaylists"]);
    expect(genrePlaylistQueryKeys.reference.list(1)).toEqual(["referenceGenrePlaylists", "list", 1]);
    expect(genrePlaylistQueryKeys.reference.full).toEqual(["referenceGenrePlaylists", "full"]);
    expect(genrePlaylistQueryKeys.reference.detail(uuid)).toEqual(["referenceGenrePlaylists", uuid]);
  });
});

describe("index barrel", () => {
  it("re-exports endpoints and query keys", () => {
    expect(barrelEndpoints).toBe(genrePlaylistEndpoints);
    expect(barrelQueryKeys).toBe(genrePlaylistQueryKeys);
  });
});
