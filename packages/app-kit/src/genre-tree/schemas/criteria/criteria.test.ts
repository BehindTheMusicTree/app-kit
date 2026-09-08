import { describe, it, expect } from "vitest";

import { CriteriaSimpleSchema } from "./simple";
import { CriteriaDetailedSchema } from "./detailed";
import { CriteriaCreationSchema } from "./creation";
import { CriteriaUpdateSchema } from "./update";

const uuid = "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d";
const minimumCriteria = { uuid, name: "Rock" };
const track = { uuid, title: "Track", artists: null };

describe("CriteriaSimpleSchema", () => {
  const valid = {
    uuid,
    name: "Rock",
    parent: null,
    createdOn: "2024-01-01T00:00:00.000Z",
    summary: "A genre summary",
  };

  it("parses a valid shape with a summary string", () => {
    expect(() => CriteriaSimpleSchema.parse(valid)).not.toThrow();
  });

  it("accepts a null summary", () => {
    expect(() => CriteriaSimpleSchema.parse({ ...valid, summary: null })).not.toThrow();
  });

  it("rejects a shape missing summary", () => {
    const { summary: _summary, ...invalid } = valid;
    expect(() => CriteriaSimpleSchema.parse(invalid)).toThrow();
  });
});

describe("CriteriaDetailedSchema", () => {
  const valid = {
    uuid,
    name: "Rock",
    parent: null,
    ascendants: [],
    descendants: [],
    root: minimumCriteria,
    children: [],
    criteriaPlaylist: minimumCriteria,
    tracks: [],
    essentialTracks: [track],
    tracksCount: 3,
    tracksArchivedCount: 0,
    updatedOn: null,
  };

  it("parses a valid shape with essentialTracks", () => {
    expect(() => CriteriaDetailedSchema.parse(valid)).not.toThrow();
  });

  it("rejects a shape missing essentialTracks", () => {
    const { essentialTracks: _essentialTracks, ...invalid } = valid;
    expect(() => CriteriaDetailedSchema.parse(invalid)).toThrow();
  });

  it("rejects an invalid essentialTracks entry", () => {
    expect(() => CriteriaDetailedSchema.parse({ ...valid, essentialTracks: [{ uuid: "not-a-uuid" }] })).toThrow();
  });
});

describe("CriteriaCreationSchema", () => {
  it("parses a valid shape without essentialTracks", () => {
    expect(() => CriteriaCreationSchema.parse({ name: "Rock" })).not.toThrow();
  });

  it("parses a valid shape with essentialTracks", () => {
    expect(() => CriteriaCreationSchema.parse({ name: "Rock", essentialTracks: [uuid] })).not.toThrow();
  });

  it("rejects an invalid essentialTracks entry", () => {
    expect(() =>
      CriteriaCreationSchema.parse({ name: "Rock", essentialTracks: ["not-a-uuid"] }),
    ).toThrow();
  });
});

describe("CriteriaUpdateSchema", () => {
  it("parses a valid shape without essentialTracks", () => {
    expect(() => CriteriaUpdateSchema.parse({ name: "Rock" })).not.toThrow();
  });

  it("parses a valid shape with essentialTracks", () => {
    expect(() => CriteriaUpdateSchema.parse({ essentialTracks: [uuid] })).not.toThrow();
  });

  it("rejects an invalid essentialTracks entry", () => {
    expect(() => CriteriaUpdateSchema.parse({ essentialTracks: ["not-a-uuid"] })).toThrow();
  });
});
