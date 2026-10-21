import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useGenreSearch } from "./useGenreSearch";
import type { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";

const makePlaylist = (uuid: string, name: string) => ({ uuid, name }) as CriteriaPlaylistSimple;
const rock = makePlaylist("p1", "Rock");
const jazz = makePlaylist("p2", "Jazz");
const genrePlaylists = [rock, jazz];

describe("useGenreSearch", () => {
  it("starts empty with nothing to clear", () => {
    const { result } = renderHook(() => useGenreSearch({ genrePlaylists, onSelect: vi.fn() }));

    expect(result.current.query).toBe("");
    expect(result.current.results).toEqual([]);
    expect(result.current.canClear).toBe(false);
  });

  it("filters results by the typed query", () => {
    const { result } = renderHook(() => useGenreSearch({ genrePlaylists, onSelect: vi.fn() }));

    act(() => result.current.setQuery("ro"));

    expect(result.current.results).toEqual([rock]);
    expect(result.current.canClear).toBe(true);
  });

  it("fills the query from selectedName and follows its changes without listing results", () => {
    const { result, rerender } = renderHook(
      ({ selectedName }: { selectedName: string | null }) =>
        useGenreSearch({ genrePlaylists, onSelect: vi.fn(), selectedName }),
      { initialProps: { selectedName: "Rock" as string | null } },
    );

    expect(result.current.query).toBe("Rock");
    expect(result.current.results).toEqual([]);

    rerender({ selectedName: "Jazz" });
    expect(result.current.query).toBe("Jazz");

    rerender({ selectedName: null });
    expect(result.current.query).toBe("");
  });

  it("clear empties the query and calls onClear", () => {
    const onClear = vi.fn();
    const { result } = renderHook(() => useGenreSearch({ genrePlaylists, onSelect: vi.fn(), onClear }));

    act(() => result.current.setQuery("ro"));
    act(() => result.current.clear());

    expect(result.current.query).toBe("");
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("clear works without onClear", () => {
    const { result } = renderHook(() => useGenreSearch({ genrePlaylists, onSelect: vi.fn() }));

    act(() => result.current.setQuery("ro"));
    act(() => result.current.clear());

    expect(result.current.query).toBe("");
  });

  it("select empties the query for a new pick and forwards it", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() => useGenreSearch({ genrePlaylists, onSelect, selectedName: "Jazz" }));

    act(() => result.current.select(rock));

    expect(result.current.query).toBe("");
    expect(onSelect).toHaveBeenCalledWith(rock);
  });

  it("select keeps the query when re-picking the shown genre", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() => useGenreSearch({ genrePlaylists, onSelect, selectedName: "Rock" }));

    act(() => result.current.select(rock));

    expect(result.current.query).toBe("Rock");
    expect(onSelect).toHaveBeenCalledWith(rock);
  });
});
