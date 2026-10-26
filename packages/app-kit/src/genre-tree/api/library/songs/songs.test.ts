import { describe, it, expect } from "vitest";

import { makeSongEndpoints } from "./endpoints";
import { makeSongQueryKeys } from "./queryKeys";
import { makeSongEndpoints as barrelMakeEndpoints, makeSongQueryKeys as barrelMakeQueryKeys } from "./index";

const uuid = "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d";

describe("makeSongEndpoints", () => {
  it("builds list/detail/delete URLs", () => {
    const endpoints = makeSongEndpoints();
    expect(endpoints.list()).toBe("library/songs/");
    expect(endpoints.detail(uuid)).toBe(`library/songs/${uuid}/`);
    expect(endpoints.delete(uuid)).toBe(`library/songs/${uuid}/`);
  });
});

describe("makeSongQueryKeys", () => {
  it("builds query keys prefixed by scope", () => {
    const keys = makeSongQueryKeys("reference");
    expect(keys.all).toEqual(["referenceSongs"]);
    expect(keys.list(3)).toEqual(["referenceSongs", "list", 3]);
    expect(keys.detail(uuid)).toEqual(["referenceSongs", "detail", uuid]);
    expect(keys.byGenre("https://b", uuid)).toEqual(["referenceSongs", "https://b", "genre", uuid]);
  });
});

describe("index barrel", () => {
  it("re-exports the makers", () => {
    expect(barrelMakeEndpoints).toBe(makeSongEndpoints);
    expect(barrelMakeQueryKeys).toBe(makeSongQueryKeys);
  });
});
