import { describe, it, expect } from "vitest";

import { makeRecordingEndpoints } from "./endpoints";
import { makeRecordingQueryKeys } from "./queryKeys";
import { makeRecordingEndpoints as barrelMakeEndpoints, makeRecordingQueryKeys as barrelMakeQueryKeys } from "./index";

const uuid = "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d";

describe("makeRecordingEndpoints", () => {
  it("builds list/detail/delete URLs", () => {
    const endpoints = makeRecordingEndpoints();
    expect(endpoints.list()).toBe("library/recordings/");
    expect(endpoints.detail(uuid)).toBe(`library/recordings/${uuid}/`);
    expect(endpoints.delete(uuid)).toBe(`library/recordings/${uuid}/`);
  });
});

describe("makeRecordingQueryKeys", () => {
  it("builds query keys prefixed by scope", () => {
    const keys = makeRecordingQueryKeys("reference");
    expect(keys.all).toEqual(["referenceRecordings"]);
    expect(keys.list(3)).toEqual(["referenceRecordings", "list", 3]);
    expect(keys.detail(uuid)).toEqual(["referenceRecordings", "detail", uuid]);
  });
});

describe("index barrel", () => {
  it("re-exports the makers", () => {
    expect(barrelMakeEndpoints).toBe(makeRecordingEndpoints);
    expect(barrelMakeQueryKeys).toBe(makeRecordingQueryKeys);
  });
});
