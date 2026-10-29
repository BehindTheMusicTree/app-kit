import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { useListFullGenrePlaylistsMock, useArtistGenreCountsMock, prefetchMock } = vi.hoisted(() => ({
  useListFullGenrePlaylistsMock: vi.fn(),
  useArtistGenreCountsMock: vi.fn(),
  prefetchMock: vi.fn(),
}));

vi.mock("./useGenrePlaylist", () => ({
  useListFullGenrePlaylists: (...args: unknown[]) => useListFullGenrePlaylistsMock(...args),
}));

vi.mock("./useArtistGenreCounts", () => ({
  useArtistGenreCounts: (...args: unknown[]) => useArtistGenreCountsMock(...args),
}));

vi.mock("./useGenre", () => ({
  usePrefetchGenreOverview: () => prefetchMock,
}));

import { useGenreTreeViewState } from "./useGenreTreeViewState";
import type { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";

const makePlaylist = (
  uuid: string,
  name: string,
  overrides: Partial<{ parent: string | null; root: string; criteria: boolean; isUnacceptedRoot: boolean }> = {},
) =>
  ({
    uuid,
    name,
    parent: overrides.parent ? { uuid: overrides.parent } : null,
    root: { uuid: overrides.root ?? uuid },
    criteria: overrides.criteria === false ? null : { uuid: `c-${uuid}` },
    isUnacceptedRoot: overrides.isUnacceptedRoot ?? false,
  }) as unknown as CriteriaPlaylistSimple;

const pop = makePlaylist("pop", "Mainstream Pop");
const rock = makePlaylist("rock", "Rock", { parent: "pop", root: "pop" });
const genreless = makePlaylist("none", "Genreless", { criteria: false });
const unaccepted = makePlaylist("un", "Pending", { isUnacceptedRoot: true });
const unacceptedChild = makePlaylist("unc", "Child", { parent: "un", root: "un" });

const options = { scope: "public" as never, getBackendBaseUrl: () => "https://b.example.com" };

const mockData = (data: CriteriaPlaylistSimple[] | undefined, isPending = false) =>
  useListFullGenrePlaylistsMock.mockReturnValue({ data, isPending });

describe("useGenreTreeViewState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useArtistGenreCountsMock.mockReturnValue({ data: undefined, isPending: true, error: null });
    mockData([pop, rock, genreless, unaccepted, unacceptedChild]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exposes loading state and an empty list while data is missing", () => {
    mockData(undefined, true);
    const { result } = renderHook(() => useGenreTreeViewState(options));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.genrePlaylists).toEqual([]);
  });

  it("indexes and groups playlists", () => {
    const { result } = renderHook(() => useGenreTreeViewState(options));

    expect(result.current.genrePlaylistByNodeId.get("rock")).toBe(rock);
    expect(result.current.groupedGenrePlaylistsByRoot.pop).toEqual([pop, rock]);
    expect(result.current.canShowPopCore).toBe(true);
  });

  it("defaults to pop-core and hides unaccepted roots and criteria-less playlists", () => {
    const { result } = renderHook(() => useGenreTreeViewState(options));

    expect(result.current.viewMode).toBe("pop-core");
    expect(result.current.visibleGenrePlaylists).toEqual([pop, rock]);
  });

  it("keeps criteria-less playlists in outline and everything in stacked", () => {
    const { result } = renderHook(() => useGenreTreeViewState(options));

    act(() => result.current.setViewMode("outline"));
    expect(result.current.visibleGenrePlaylists).toEqual([pop, rock, genreless]);

    act(() => result.current.setViewMode("stacked"));
    expect(result.current.visibleGenrePlaylists).toHaveLength(5);
  });

  it("falls back to wheel when there is no Mainstream Pop root", () => {
    mockData([rock]);
    const { result } = renderHook(() => useGenreTreeViewState(options));

    expect(result.current.canShowPopCore).toBe(false);
    expect(result.current.viewMode).toBe("wheel");
  });

  it("does not fall back to wheel while loading", () => {
    mockData([], true);
    const { result } = renderHook(() => useGenreTreeViewState({ ...options, viewMode: "stacked" }));

    expect(result.current.viewMode).toBe("stacked");
  });

  it("honours a controlled view mode", () => {
    const { result } = renderHook(() => useGenreTreeViewState({ ...options, viewMode: "wheel" }));

    expect(result.current.viewMode).toBe("wheel");
    expect(result.current.isViewModeControlled).toBe(true);
  });

  it("manages an internal selection and reports changes", () => {
    const onSelectedNodeIdChange = vi.fn();
    const { result } = renderHook(() => useGenreTreeViewState({ ...options, onSelectedNodeIdChange }));

    act(() => result.current.selectNode({ id: "rock" }));
    expect(result.current.selectedNodeId).toBe("rock");
    expect(result.current.selectedGenrePlaylist).toBe(rock);

    act(() => result.current.selectGenrePlaylist(pop));
    expect(result.current.selectedNodeId).toBe("pop");

    act(() => result.current.clearSelection());
    expect(result.current.selectedNodeId).toBeNull();

    act(() => result.current.selectNode(null));
    expect(onSelectedNodeIdChange).toHaveBeenLastCalledWith(null);
    expect(onSelectedNodeIdChange).toHaveBeenCalledTimes(4);
  });

  it("does not change a controlled selection but still reports", () => {
    const onSelectedNodeIdChange = vi.fn();
    const { result } = renderHook(() =>
      useGenreTreeViewState({ ...options, selectedNodeId: "pop", onSelectedNodeIdChange }),
    );

    act(() => result.current.selectNode({ id: "rock" }));

    expect(result.current.selectedNodeId).toBe("pop");
    expect(onSelectedNodeIdChange).toHaveBeenCalledWith("rock");
  });

  it("toggles wheel rotation", () => {
    const { result } = renderHook(() => useGenreTreeViewState(options));

    act(() => result.current.toggleWheelRotation());
    expect(result.current.allowWheelRotation).toBe(true);
  });

  it("prefetches the hovered genre once the pointer rests, restarting on each hover", () => {
    const { result } = renderHook(() => useGenreTreeViewState(options));

    act(() => result.current.onNodeHover({ id: "pop" }));
    act(() => result.current.onNodeHover({ id: "rock" }));
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(prefetchMock).toHaveBeenCalledOnce();
    expect(prefetchMock).toHaveBeenCalledWith("c-rock");
  });

  it("skips prefetch for unknown or criteria-less nodes and cancels on unmount", () => {
    const { result, unmount } = renderHook(() => useGenreTreeViewState(options));

    act(() => result.current.onNodeHover({ id: "missing" }));
    act(() => result.current.onNodeHover({ id: "none" }));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(prefetchMock).not.toHaveBeenCalled();

    act(() => result.current.onNodeHover({ id: "rock" }));
    unmount();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(prefetchMock).not.toHaveBeenCalled();
  });

  describe("with an artist", () => {
    const artistUuid = "a1";
    const counts = [
      { genrePlaylist: "pop", songsCount: 2, tracksCount: 1 },
      { genrePlaylist: "rock", songsCount: 2, tracksCount: 1 },
    ];

    it("keeps the current tree and reports fetching while counts load", () => {
      const { result } = renderHook(() => useGenreTreeViewState({ ...options, artistUuid }));

      expect(useArtistGenreCountsMock).toHaveBeenCalledWith(artistUuid, options.getBackendBaseUrl);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(true);
      expect(result.current.genrePlaylists.length).toBeGreaterThan(0);
    });

    it("keeps pruning by the previous artist's counts while the next artist's load", () => {
      useArtistGenreCountsMock.mockReturnValue({ data: counts, isPending: false, isPlaceholderData: true, error: null });
      const { result } = renderHook(() => useGenreTreeViewState({ ...options, artistUuid }));

      expect(result.current.isFetching).toBe(true);
      expect(result.current.genrePlaylists.map((gp) => gp.uuid)).toEqual(["pop", "rock"]);
    });

    it("serves the pruned tree with the artist's counts to every consumer", () => {
      mockData([pop, rock, makePlaylist("jazz", "Jazz", { parent: "pop", root: "pop" })]);
      useArtistGenreCountsMock.mockReturnValue({ data: counts, isPending: false, error: null });
      const { result } = renderHook(() => useGenreTreeViewState({ ...options, artistUuid, selectedNodeId: "rock" }));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.visibleGenrePlaylists.map((gp) => [gp.uuid, gp.tracksCount])).toEqual([
        ["pop", 1],
        ["rock", 1],
      ]);
      expect(result.current.genrePlaylistByNodeId.has("jazz")).toBe(false);
      expect(result.current.selectedGenrePlaylist?.uuid).toBe("rock");
      expect(result.current.canShowPopCore).toBe(true);
    });

    it("serves the whole tree when the counts fail", () => {
      useArtistGenreCountsMock.mockReturnValue({ data: undefined, isPending: false, error: new Error("404") });
      const { result } = renderHook(() => useGenreTreeViewState({ ...options, artistUuid }));

      expect(result.current.genrePlaylists).toHaveLength(5);
    });
  });
});
