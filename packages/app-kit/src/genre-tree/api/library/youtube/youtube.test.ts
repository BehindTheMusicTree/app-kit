import { describe, it, expect } from "vitest";

import { makeYoutubeEndpoints } from "./endpoints";
import { makeYoutubeQueryKeys } from "./queryKeys";
import { makeYoutubeEndpoints as barrelMakeEndpoints, makeYoutubeQueryKeys as barrelMakeQueryKeys } from "./index";

const uuid = "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d";

describe("makeYoutubeEndpoints", () => {
  it("builds list/detail/delete URLs", () => {
    const endpoints = makeYoutubeEndpoints();
    expect(endpoints.list()).toBe("library/youtube/");
    expect(endpoints.detail(uuid)).toBe(`library/youtube/${uuid}/`);
    expect(endpoints.delete(uuid)).toBe(`library/youtube/${uuid}/`);
  });
});

describe("makeYoutubeQueryKeys", () => {
  it("builds query keys prefixed by scope", () => {
    const keys = makeYoutubeQueryKeys("reference");
    expect(keys.all).toEqual(["referenceYoutubeTracks"]);
    expect(keys.list(3)).toEqual(["referenceYoutubeTracks", "list", 3]);
    expect(keys.detail(uuid)).toEqual(["referenceYoutubeTracks", "detail", uuid]);
  });
});

describe("index barrel", () => {
  it("re-exports the makers", () => {
    expect(barrelMakeEndpoints).toBe(makeYoutubeEndpoints);
    expect(barrelMakeQueryKeys).toBe(makeYoutubeQueryKeys);
  });
});
