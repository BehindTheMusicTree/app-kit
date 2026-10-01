import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { useTrackListMock } = vi.hoisted(() => ({ useTrackListMock: vi.fn() }));

vi.mock("./TrackListContext", () => ({ useTrackList: useTrackListMock }));
vi.mock("../auth/SessionContext", () => ({
  useSession: () => ({ session: { accessToken: "token" }, sessionRestored: true }),
}));

import { GenrePlaylistTracks } from "./GenrePlaylistTracks";

const genrePlaylist = { uuid: "p1", name: "Jazz" };
const makeTracks = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, i) => ({ uuid: `${prefix}${i}`, title: `Song ${prefix}${i}`, artists: null }));

describe("GenrePlaylistTracks", () => {
  let observerCallback: IntersectionObserverCallback;
  const fetchGenrePlaylistTracksPage = vi.fn();
  const playNewTrackListFromGenrePlaylist = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    useTrackListMock.mockReturnValue({ fetchGenrePlaylistTracksPage, playNewTrackListFromGenrePlaylist });
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(function (this: unknown, callback: IntersectionObserverCallback) {
        observerCallback = callback;
        return { observe: vi.fn(), disconnect: vi.fn() };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderTracks = (scope: "me" | "reference" = "reference") =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <GenrePlaylistTracks genrePlaylist={genrePlaylist} scope={scope} getBackendBaseUrl={() => "https://b"} />
      </QueryClientProvider>,
    );

  it("loads the next page on scroll and plays from the clicked track with a seed", async () => {
    const page1 = makeTracks(2, "a");
    const page2 = makeTracks(2, "b");
    fetchGenrePlaylistTracksPage
      .mockResolvedValueOnce({ tracks: page1, total: 250, nextPage: 2 })
      .mockResolvedValueOnce({ tracks: page2, total: 250, nextPage: 3 });

    renderTracks();

    expect(await screen.findByRole("button", { name: "Song a1" })).toBeInTheDocument();
    expect(screen.getByText("Tracks (250)")).toBeInTheDocument();
    expect(fetchGenrePlaylistTracksPage).toHaveBeenCalledWith("p1", "reference", 1);

    await act(async () => {
      observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    fireEvent.click(await screen.findByRole("button", { name: "Song b0" }));

    expect(fetchGenrePlaylistTracksPage).toHaveBeenLastCalledWith("p1", "reference", 2);
    expect(playNewTrackListFromGenrePlaylist).toHaveBeenCalledWith(genrePlaylist, "reference", {
      tracks: [...page1, ...page2],
      total: 250,
      nextPage: 3,
      startIndex: 2,
    });
  });

  it("lists artists and logs when playing fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("boom");
    playNewTrackListFromGenrePlaylist.mockRejectedValueOnce(failure);
    fetchGenrePlaylistTracksPage.mockResolvedValueOnce({
      tracks: [{ uuid: "t1", title: "Song", artists: [{ uuid: "x", name: "A" }, { uuid: "y", name: "B" }] }],
      total: 1,
      nextPage: null,
    });

    renderTracks();
    const button = await screen.findByRole("button", { name: "Song — A, B" });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(errorSpy).toHaveBeenCalledWith("Failed to play genre playlist:", failure);
    errorSpy.mockRestore();
  });

  it("shows a dash when the me playlist has no tracks", async () => {
    fetchGenrePlaylistTracksPage.mockResolvedValueOnce({ tracks: [], total: 0, nextPage: null });

    renderTracks("me");

    expect(await screen.findByText("—")).toBeInTheDocument();
    expect(fetchGenrePlaylistTracksPage).toHaveBeenCalledWith("p1", "me", 1);
  });
});
