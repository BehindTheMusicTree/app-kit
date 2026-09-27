import { describe, it, expect } from "vitest";
import { TrackListOriginFromTrack } from "./TrackListOrigin";
import { TrackBase } from "../schemas/track/base";

function makeTrack(artists: TrackBase["artists"]): TrackBase {
  return { uuid: "t1", title: "Karma Police", artists } as TrackBase;
}

describe("TrackListOriginFromTrack", () => {
  it("labels the origin with the track title and comma-joined artist names", () => {
    const origin = new TrackListOriginFromTrack(
      makeTrack([{ name: "Radiohead" }, { name: "Thom Yorke" }] as TrackBase["artists"]),
      "me",
    );

    expect(origin.label).toBe("Karma Police by Radiohead, Thom Yorke");
  });

  it("leaves the artist part empty when the track has no artists", () => {
    const origin = new TrackListOriginFromTrack(makeTrack(null), "me");

    expect(origin.label).toBe("Karma Police by ");
  });
});
