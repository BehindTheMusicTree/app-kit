import { describe, it, expect } from "vitest";

import { CriteriaPlaylistDetailedSchema } from "./detailed";
import { CriteriaPlaylistSimpleSchema } from "./simple";

const uuid = "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d";

const validCriteriaPlaylistBase = {
  uuid,
  name: "Rock",
  tracksCount: 3,
  viewsCount: 900,
  durationInSec: 180,
  durationStrInHourMinSec: "00:03:00",
  criteria: { uuid, name: "Rock" },
  parent: null,
  root: { uuid, name: "Root" },
  createdOn: "2024-01-01T00:00:00.000Z",
  updatedOn: null,
};

describe("CriteriaPlaylistDetailedSchema", () => {
  it("parses a valid base shape", () => {
    expect(() => CriteriaPlaylistDetailedSchema.parse(validCriteriaPlaylistBase)).not.toThrow();
  });

  it("rejects a shape missing a required field", () => {
    const { name: _name, ...invalid } = validCriteriaPlaylistBase;
    expect(() => CriteriaPlaylistDetailedSchema.parse(invalid)).toThrow();
  });

  it("accepts a shape without viewsCount, as hear-api sends it", () => {
    const { viewsCount: _viewsCount, ...withoutViews } = validCriteriaPlaylistBase;
    expect(() => CriteriaPlaylistDetailedSchema.parse(withoutViews)).not.toThrow();
  });

  it("accepts null/omitted duration fields", () => {
    const { durationInSec: _durationInSec, durationStrInHourMinSec: _durationStrInHourMinSec, ...rest } =
      validCriteriaPlaylistBase;
    expect(() => CriteriaPlaylistDetailedSchema.parse(rest)).not.toThrow();
  });
});

describe("CriteriaPlaylistSimpleSchema", () => {
  it("parses a valid simple shape", () => {
    const valid = {
      uuid,
      name: "Rock",
      criteria: { uuid, name: "Rock" },
      parent: null,
      root: { uuid, name: "Root" },
      tracksCount: 3,
      viewsCount: 900,
      createdOn: "2024-01-01T00:00:00.000Z",
      updatedOn: null,
      isUnacceptedRoot: false,
    };
    expect(() => CriteriaPlaylistSimpleSchema.parse(valid)).not.toThrow();
  });

  it.each([["commercial"], ["underground"], [null], [undefined]])("accepts scene %s", (scene) => {
    const valid = {
      uuid,
      name: "Rock",
      criteria: { uuid, name: "Rock" },
      parent: null,
      root: { uuid, name: "Root" },
      tracksCount: 3,
      viewsCount: 900,
      createdOn: "2024-01-01T00:00:00.000Z",
      updatedOn: null,
      isUnacceptedRoot: false,
      scene,
    };
    expect(() => CriteriaPlaylistSimpleSchema.parse(valid)).not.toThrow();
  });

  it("rejects an unknown scene", () => {
    const invalid = {
      uuid,
      name: "Rock",
      criteria: null,
      parent: null,
      root: { uuid, name: "Root" },
      tracksCount: 3,
      viewsCount: 900,
      createdOn: "2024-01-01T00:00:00.000Z",
      updatedOn: null,
      isUnacceptedRoot: false,
      scene: "mainstream",
    };
    expect(() => CriteriaPlaylistSimpleSchema.parse(invalid)).toThrow();
  });

  it("rejects a shape with a wrong-typed field", () => {
    const invalid = {
      uuid,
      name: "Rock",
      criteria: null,
      parent: null,
      root: { uuid, name: "Root" },
      tracksCount: "not-a-number",
      createdOn: "2024-01-01T00:00:00.000Z",
      updatedOn: null,
    };
    expect(() => CriteriaPlaylistSimpleSchema.parse(invalid)).toThrow();
  });
});
