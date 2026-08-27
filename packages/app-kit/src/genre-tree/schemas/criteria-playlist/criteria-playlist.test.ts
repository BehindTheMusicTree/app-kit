import { describe, it, expect } from "vitest";
import { z } from "zod";

import { CriteriaPlaylistDetailedBaseSchema, makeCriteriaPlaylistDetailedSchema } from "./detailed";
import { CriteriaPlaylistSimpleSchema } from "./simple";

const trackSchema = z.object({ uuid: z.string().uuid() });
const CriteriaPlaylistDetailedSchema = makeCriteriaPlaylistDetailedSchema(trackSchema);

const uuid = "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d";

const validCriteriaPlaylistBase = {
  uuid,
  name: "Rock",
  tracksCount: 3,
  durationInSec: 180,
  durationStrInHourMinSec: "00:03:00",
  tracksArchivedCount: 0,
  criteria: { uuid, name: "Rock" },
  parent: null,
  root: { uuid, name: "Root" },
  createdOn: "2024-01-01T00:00:00.000Z",
  updatedOn: null,
};

describe("CriteriaPlaylistDetailedBaseSchema", () => {
  it("parses a valid base shape", () => {
    expect(() => CriteriaPlaylistDetailedBaseSchema.parse(validCriteriaPlaylistBase)).not.toThrow();
  });

  it("rejects a shape missing a required field", () => {
    const { name: _name, ...invalid } = validCriteriaPlaylistBase;
    expect(() => CriteriaPlaylistDetailedBaseSchema.parse(invalid)).toThrow();
  });

  it("accepts null/omitted duration fields", () => {
    const { durationInSec: _durationInSec, durationStrInHourMinSec: _durationStrInHourMinSec, ...rest } =
      validCriteriaPlaylistBase;
    expect(() => CriteriaPlaylistDetailedBaseSchema.parse(rest)).not.toThrow();
  });
});

describe("makeCriteriaPlaylistDetailedSchema", () => {
  it("parses a valid detailed shape with trackPlaylistRelations", () => {
    const valid = {
      ...validCriteriaPlaylistBase,
      trackPlaylistRelations: [{ track: { uuid }, position: 0 }],
    };
    expect(() => CriteriaPlaylistDetailedSchema.parse(valid)).not.toThrow();
  });

  it("rejects a shape with an invalid trackPlaylistRelations entry", () => {
    const invalid = {
      ...validCriteriaPlaylistBase,
      trackPlaylistRelations: [{ track: { uuid }, position: -1 }],
    };
    expect(() => CriteriaPlaylistDetailedSchema.parse(invalid)).toThrow();
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
      createdOn: "2024-01-01T00:00:00.000Z",
      updatedOn: null,
    };
    expect(() => CriteriaPlaylistSimpleSchema.parse(valid)).not.toThrow();
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
