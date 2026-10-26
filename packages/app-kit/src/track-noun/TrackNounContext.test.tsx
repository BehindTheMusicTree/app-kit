import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrackNounProvider, useTrackNoun } from "./TrackNounContext";

describe("useTrackNoun", () => {
  it("returns the noun supplied by the provider", () => {
    const { result } = renderHook(() => useTrackNoun(), {
      wrapper: ({ children }) => (
        <TrackNounProvider singular="song" plural="songs">
          {children}
        </TrackNounProvider>
      ),
    });
    expect(result.current).toEqual({ singular: "song", plural: "songs" });
  });

  it("throws without a provider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useTrackNoun())).toThrow("useTrackNoun must be used within a TrackNounProvider");
    errorSpy.mockRestore();
  });
});
