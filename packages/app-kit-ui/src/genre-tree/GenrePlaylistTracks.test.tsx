import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import { render } from "../test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { useTrackListMock, usePlayerMock, fetchMock, showPopupMock } = vi.hoisted(() => ({
  showPopupMock: vi.fn(),
  useTrackListMock: vi.fn(),
  usePlayerMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("@behindthemusictree/app-kit/genre-tree", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTrackList: useTrackListMock,
}));
vi.mock("@behindthemusictree/app-kit/player", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePlayer: usePlayerMock,
}));
vi.mock("@behindthemusictree/app-kit/transport", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useFetchWrapper: () => ({ fetch: fetchMock }),
  parseWithLog: (_schema: unknown, data: unknown) => data,
}));

vi.mock("../popup/InternalErrorPopup", () => ({ default: () => null }));
vi.mock("@behindthemusictree/app-kit/popup", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePopup: () => ({ showPopup: showPopupMock }),
}));
vi.mock("@behindthemusictree/app-kit/auth", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useSession: () => ({ session: { accessToken: "token" }, sessionRestored: true }),
}));

import { GenrePlaylistTracks } from "./GenrePlaylistTracks";
import { PlayStates } from "@behindthemusictree/app-kit/player";
import type { RenderArtistLink } from "@behindthemusictree/app-kit/genre-tree";
import { makeGenrePlaylistUuid, makeGenreUuid } from "@behindthemusictree/app-kit/genre-tree/testing";

const genrePlaylist = { uuid: makeGenrePlaylistUuid("p1"), name: "Jazz" };
const makeTracks = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, i) => ({ uuid: `${prefix}${i}`, title: `Song ${prefix}${i}`, artists: null }));
const songsPage = (results: unknown[], { next = false, total = results.length as number | null } = {}) => ({
  overallTotal: total,
  next: next ? "https://b/library/songs/?genre=g1&pageSize=100&cursor=CUR2" : null,
  previous: null,
  results,
  page: null,
  pageSize: 100,
  totalPages: null,
});

describe("GenrePlaylistTracks", () => {
  let observerCallback: IntersectionObserverCallback;
  const fetchGenrePlaylistTracksPage = vi.fn();
  const playNewTrackListFromGenrePlaylist = vi.fn().mockResolvedValue(undefined);
  const handlePlayPauseAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useTrackListMock.mockReturnValue({ fetchGenrePlaylistTracksPage, playNewTrackListFromGenrePlaylist });
    usePlayerMock.mockReturnValue({ playerTrackObject: null, playState: PlayStates.STOPPED, handlePlayPauseAction });
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

  const renderTracks = (scope: "me" | "reference" = "reference", renderArtistLink?: RenderArtistLink) =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <GenrePlaylistTracks
          genreUuid={makeGenreUuid("g1")}
          genrePlaylist={genrePlaylist}
          scope={scope}
          getBackendBaseUrl={() => "https://b"}
          renderArtistLink={renderArtistLink}
        />
      </QueryClientProvider>,
    );

  it("lists the genre catalogue page by page and plays from the clicked song", async () => {
    const page1 = makeTracks(2, "a");
    const page2 = makeTracks(2, "b");
    fetchMock
      .mockResolvedValueOnce(songsPage(page1, { next: true, total: 250 }))
      .mockResolvedValueOnce(songsPage(page2, { next: true, total: 250 }));

    renderTracks();

    expect(await screen.findByRole("button", { name: "Play Song a1" })).toBeInTheDocument();
    expect(screen.getByText("Tracks (250)")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("library/songs/", true, false, {}, { genre: "g1", pageSize: 100, withTotal: false });

    await act(async () => {
      observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    fireEvent.click(await screen.findByRole("button", { name: "Play Song b0" }));

    expect(fetchMock).toHaveBeenLastCalledWith("library/songs/", true, false, {}, { genre: "g1", pageSize: 100, withTotal: false, cursor: "CUR2" });
    expect(fetchGenrePlaylistTracksPage).not.toHaveBeenCalled();
    expect(playNewTrackListFromGenrePlaylist).toHaveBeenCalledWith(genrePlaylist, "reference", { startSongUuid: "b0" });
  });

  it("shows a dash for an empty catalogue and no count when the total is null", async () => {
    fetchMock.mockResolvedValueOnce(songsPage([], { total: null }));

    renderTracks();

    expect(await screen.findByText("—")).toBeInTheDocument();
    expect(screen.getByText("Tracks")).toBeInTheDocument();
  });

  it("shows an error with a retry instead of a dash when the request fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(songsPage(makeTracks(1, "a")));

    renderTracks();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load tracks.");
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("button", { name: "Play Song a0" })).toBeInTheDocument();
  });

  it("shows the error state when the next link carries no cursor", async () => {
    fetchMock.mockResolvedValueOnce({ ...songsPage(makeTracks(1, "a")), next: "https://b/library/songs/?genre=g1" });

    renderTracks();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("lists artists, logs and shows an error popup when playing fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("boom");
    playNewTrackListFromGenrePlaylist.mockRejectedValueOnce(failure);
    fetchMock.mockResolvedValueOnce(songsPage([{ uuid: "t1", title: "Song", artists: [{ uuid: "x", name: "A" }, { uuid: "y", name: "B" }] }]));

    renderTracks();
    const button = await screen.findByRole("button", { name: "Play Song — A, B" });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(errorSpy).toHaveBeenCalledWith("Failed to play genre playlist:", failure);
    expect(showPopupMock).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it("links artist names when renderArtistLink is set", async () => {
    fetchMock.mockResolvedValueOnce(songsPage([{ uuid: "t1", title: "Song", artists: [{ uuid: "x", name: "A" }] }]));

    renderTracks("reference", (artist) => <a href={`/artists/${artist.uuid}`}>{artist.name}</a>);

    expect(await screen.findByRole("link", { name: "A" })).toHaveAttribute("href", "/artists/x");
  });

  it("does not play when the row text is clicked", async () => {
    fetchMock.mockResolvedValueOnce(songsPage(makeTracks(1, "a")));

    renderTracks();
    fireEvent.click(await screen.findByText("Song a0"));

    expect(playNewTrackListFromGenrePlaylist).not.toHaveBeenCalled();
  });

  it("toggles play/pause on the current track instead of restarting the list", async () => {
    usePlayerMock.mockReturnValue({
      playerTrackObject: { track: { id: "a0" } },
      playState: PlayStates.PLAYING,
      handlePlayPauseAction,
    });
    fetchMock.mockResolvedValueOnce(songsPage(makeTracks(2, "a")));

    renderTracks();
    fireEvent.click(await screen.findByRole("button", { name: "Pause Song a0" }));

    expect(handlePlayPauseAction).toHaveBeenCalledTimes(1);
    expect(playNewTrackListFromGenrePlaylist).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Play Song a1" })).toBeInTheDocument();
  });

  it("shows a dash when the me playlist has no tracks", async () => {
    fetchGenrePlaylistTracksPage.mockResolvedValueOnce({ tracks: [], total: 0, nextPage: null });

    renderTracks("me");

    expect(await screen.findByText("—")).toBeInTheDocument();
    expect(fetchGenrePlaylistTracksPage).toHaveBeenCalledWith("p1", "me", 1);
  });

  it("greys out an unplayable track with its reason and a disabled play button", async () => {
    fetchMock.mockResolvedValueOnce(songsPage([{ uuid: "x", title: "Blocked", artists: null, youtubeVideo: { id: "v1", unplayableReason: "private" }, musicbrainzRecordingId: null }]));

    renderTracks();

    const button = await screen.findByRole("button", { name: "Blocked — Private video" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Private video")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveClass("opacity-50");
    fireEvent.click(button);
    expect(playNewTrackListFromGenrePlaylist).not.toHaveBeenCalled();
  });

  it("shows a song without a video as unplayable", async () => {
    fetchMock.mockResolvedValueOnce(songsPage([{ uuid: "x", title: "Lucky", artists: null, youtubeVideo: null, musicbrainzRecordingId: null }]));

    renderTracks();

    expect(await screen.findByRole("button", { name: "Lucky — No video available" })).toBeDisabled();
  });

  it("links tracks with an MBID to MusicBrainz without starting playback", async () => {
    fetchMock.mockResolvedValueOnce(songsPage([
        { uuid: "m", title: "Linked", artists: null, youtubeVideo: { id: "v1", unplayableReason: null }, musicbrainzRecordingId: "b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d" },
        { uuid: "n", title: "Unlinked", artists: null, youtubeVideo: { id: "v1", unplayableReason: null }, musicbrainzRecordingId: null },
      ]));

    renderTracks();

    const link = await screen.findByRole("link", { name: "View Linked on MusicBrainz" });
    expect(link).toHaveAttribute("href", "https://musicbrainz.org/recording/b1e6a1c8-0e3d-4d3d-9d2e-2f6c1a2b3c4d");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("link", { name: "View Unlinked on MusicBrainz" })).not.toBeInTheDocument();
    fireEvent.click(link);
    expect(playNewTrackListFromGenrePlaylist).not.toHaveBeenCalled();
  });

  it("renders the leading, actions and toolbar slots around each song", async () => {
    fetchMock.mockResolvedValueOnce(songsPage(makeTracks(2, "a")));

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <GenrePlaylistTracks
          genreUuid={makeGenreUuid("g1")}
          genrePlaylist={genrePlaylist}
          scope="reference"
          getBackendBaseUrl={() => "https://b"}
          renderTracksToolbar={() => <button type="button">Link tracks</button>}
          renderSongLeading={(song, index) => <input type="checkbox" aria-label={`Select ${song.title} #${index}`} />}
          renderSongActions={(song) => <button type="button">Unlink {song.title}</button>}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("checkbox", { name: "Select Song a0 #0" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link tracks" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Song a0 #0" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Song a1 #1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlink Song a1" })).toBeInTheDocument();
  });

  it("renders no slot content by default", async () => {
    fetchMock.mockResolvedValueOnce(songsPage(makeTracks(1, "a")));

    renderTracks();

    await screen.findByRole("button", { name: "Play Song a0" });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
