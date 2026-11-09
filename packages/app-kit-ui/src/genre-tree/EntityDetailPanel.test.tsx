import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { EntityDetailPanel, type EntityDetailPanelProps } from "./EntityDetailPanel";

type Result = { status: string; song?: unknown; artist?: unknown };
const { useSongMock, useArtistMock } = vi.hoisted(() => ({
  useSongMock: vi.fn<(uuid: string | null) => Result>(),
  useArtistMock: vi.fn<(uuid: string | null) => Result>(),
}));

vi.mock("../../../app-kit/src/genre-tree/useSong", () => ({ useSong: (uuid: string | null) => useSongMock(uuid) }));
vi.mock("../../../app-kit/src/genre-tree/useSongHistory", () => ({ useSongHistory: () => ({ status: "idle" }) }));
vi.mock("../../../app-kit/src/genre-tree/useArtist", () => ({ useArtist: (uuid: string | null) => useArtistMock(uuid) }));
vi.mock("./artist/ArtistSongs", () => ({ default: () => <p>Songs list</p> }));
vi.mock("../../../app-kit/src/genre-tree/TrackListContext", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTrackList: () => ({ playNewTrackListFromTrackUuid: vi.fn() }),
}));
vi.mock("../../../app-kit/src/player/PlayerContext", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePlayer: () => ({ playerTrackObject: null, playState: "paused", handlePlayPauseAction: vi.fn() }),
}));

const song = {
  uuid: "s1",
  title: "Karma Police",
  artists: [{ uuid: "a1", name: "Radiohead", isSpecialPurpose: false }],
  genre: { uuid: "g-alt", name: "Alternative rock" },
  youtubeVideo: null,
  musicbrainzRecordingId: null,
  playCount: 0,
};
const artist = {
  uuid: "a1",
  name: "Radiohead",
  musicbrainzArtistId: null,
  type: "group",
  country: "GB",
  beginYear: 1985,
  endYear: null,
  ended: false,
  links: [],
  members: [],
  memberOf: [],
  albums: [],
  tracksCount: 1,
  image: null,
};
const rock = { uuid: "gp-rock", name: "Rock" };

type Entities = Partial<Pick<EntityDetailPanelProps, "songUuid" | "artistUuid">>;
type TreeNavigation = Extract<EntityDetailPanelProps, { getGenrePath: unknown }>;

function renderPanel(props: Entities = {}, treeNavigation?: Pick<TreeNavigation, "getGenrePath" | "onSelectGenrePlaylist">) {
  const onSongUuidChange = vi.fn();
  const onArtistUuidChange = vi.fn();
  const onSelectGenre = vi.fn();
  render(
    <EntityDetailPanel
      scope="me"
      getBackendBaseUrl={() => "/api"}
      songUuid={null}
      artistUuid={null}
      onSongUuidChange={onSongUuidChange}
      onArtistUuidChange={onArtistUuidChange}
      {...props}
      {...(treeNavigation ?? { onSelectGenre })}
    />,
  );
  return { onSongUuidChange, onArtistUuidChange, onSelectGenre };
}

describe("EntityDetailPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useSongMock.mockReturnValue({ status: "idle" });
    useArtistMock.mockReturnValue({ status: "idle" });
  });

  it("renders nothing while neither a song nor an artist is set", () => {
    useSongMock.mockReturnValue({ status: "idle" });
    useArtistMock.mockReturnValue({ status: "idle" });
    renderPanel();

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("shows the song when both are set", () => {
    useSongMock.mockReturnValue({ status: "success", song });
    useArtistMock.mockReturnValue({ status: "success", artist });
    renderPanel({ songUuid: "s1", artistUuid: "a1" });

    expect(screen.getByText("Karma Police")).toBeInTheDocument();
    expect(screen.queryByText("Songs list")).not.toBeInTheDocument();
  });

  it("shows the artist when only an artist is set", () => {
    useSongMock.mockReturnValue({ status: "idle" });
    useArtistMock.mockReturnValue({ status: "success", artist });
    renderPanel({ artistUuid: "a1" });

    expect(screen.getAllByText("Radiohead").length).toBeGreaterThan(0);
  });

  it("shows a busy state while the song loads", () => {
    useSongMock.mockReturnValue({ status: "loading" });
    renderPanel({ songUuid: "s1" });

    expect(document.body.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("says when the song does not exist", () => {
    useSongMock.mockReturnValue({ status: "not-found" });
    renderPanel({ songUuid: "nope" });

    expect(screen.getByText("This song does not exist.")).toBeInTheDocument();
  });

  it("opens the song's genre by itself when the host has no tree", () => {
    useSongMock.mockReturnValue({ status: "success", song });
    const { onSelectGenre } = renderPanel({ songUuid: "s1" });

    fireEvent.click(screen.getByRole("button", { name: "Alternative rock" }));

    expect(onSelectGenre).toHaveBeenCalledWith(song.genre);
  });

  it("opens a genre playlist from the tree lineage when the host has a tree", () => {
    useSongMock.mockReturnValue({ status: "success", song });
    const onSelectGenrePlaylist = vi.fn();
    renderPanel({ songUuid: "s1" }, { getGenrePath: () => [rock] as never, onSelectGenrePlaylist });

    fireEvent.click(screen.getByRole("button", { name: "Rock" }));

    expect(onSelectGenrePlaylist).toHaveBeenCalledWith(rock);
  });

  it("opens the artist from a song's artist name and clears the song on close", () => {
    useSongMock.mockReturnValue({ status: "success", song });
    const { onArtistUuidChange } = renderPanel({ songUuid: "s1" });

    fireEvent.click(screen.getByRole("button", { name: "Radiohead" }));

    expect(onArtistUuidChange).toHaveBeenCalledWith("a1");
  });
});
