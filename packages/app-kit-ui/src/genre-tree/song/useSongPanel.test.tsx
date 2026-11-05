import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { useSongPanel } from "./useSongPanel";

type SongResult = { status: string; song?: unknown };
const { useSongMock, playNewTrackListFromTrackUuidMock, handlePlayPauseActionMock, playerState } = vi.hoisted(() => ({
  useSongMock: vi.fn<(uuid: string | null) => SongResult>(),
  playNewTrackListFromTrackUuidMock: vi.fn(),
  handlePlayPauseActionMock: vi.fn(),
  playerState: { value: { playerTrackObject: null as unknown, playState: "paused" } },
}));

vi.mock("../../../../app-kit/src/genre-tree/useSong", () => ({ useSong: (uuid: string | null) => useSongMock(uuid) }));
vi.mock("../../../../app-kit/src/genre-tree/useSongHistory", () => ({ useSongHistory: () => ({ status: "idle" }) }));
vi.mock("../../../../app-kit/src/genre-tree/TrackListContext", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTrackList: () => ({ playNewTrackListFromTrackUuid: playNewTrackListFromTrackUuidMock }),
}));
vi.mock("../../../../app-kit/src/player/PlayerContext", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePlayer: () => ({ ...playerState.value, handlePlayPauseAction: handlePlayPauseActionMock }),
}));

const UUID = "11111111-1111-1111-1111-111111111111";
const song = {
  uuid: UUID,
  title: "Karma Police",
  artists: [{ uuid: "a1", name: "Radiohead", isSpecialPurpose: false }],
  genre: { uuid: "g-alt", name: "Alternative rock" },
  youtubeVideo: { id: "vid", unplayableReason: null, viewCount: 1234 },
  musicbrainzRecordingId: "22222222-2222-2222-2222-222222222222",
  firstReleaseYear: 1997,
  essentialGenres: [{ uuid: "g-brit", name: "Britpop" }],
  playCount: 7,
};
const rock = { uuid: "gp-rock", name: "Rock" };
const alt = { uuid: "gp-alt", name: "Alternative rock" };

function Harness({ uuid, onSelectGenre = vi.fn(), genrePath = [rock, alt] }: { uuid: string | null; onSelectGenre?: (g: unknown) => void; genrePath?: unknown[] }) {
  const panel = useSongPanel({
    uuid,
    scope: "me",
    getBackendBaseUrl: () => "/api",
    renderArtistLink: ({ name }) => name,
    getGenrePath: () => genrePath as never,
    onSelectGenre: onSelectGenre as never,
    expanded: false,
    onExpandedChange: vi.fn(),
    onClose: vi.fn(),
  });
  if (!panel) return <p>No panel</p>;
  return <section aria-label={typeof panel.title === "string" ? panel.title : undefined}>{panel.content}</section>;
}

describe("useSongPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    playerState.value = { playerTrackObject: null, playState: "paused" };
  });

  it("returns no panel without a song", () => {
    useSongMock.mockReturnValue({ status: "idle" });
    render(<Harness uuid={null} />);

    expect(screen.getByText("No panel")).toBeInTheDocument();
  });

  it("says the song does not exist", () => {
    useSongMock.mockReturnValue({ status: "not-found" });
    render(<Harness uuid="nope" />);

    expect(screen.getByRole("region", { name: "Song not found" })).toHaveTextContent("This song does not exist.");
  });

  it("says the song could not be loaded", () => {
    useSongMock.mockReturnValue({ status: "error" });
    render(<Harness uuid={UUID} />);

    expect(screen.getByRole("region", { name: "Song" })).toHaveTextContent("Could not load this song.");
  });

  it("shows the song's details titled by its name", () => {
    useSongMock.mockReturnValue({ status: "success", song });
    render(<Harness uuid={UUID} />);

    const panel = screen.getByRole("region", { name: "Karma Police" });
    expect(panel).toHaveTextContent("Radiohead");
    expect(panel).toHaveTextContent("1997");
    expect(panel).toHaveTextContent("1,234");
    expect(panel).toHaveTextContent("Britpop");
    expect(screen.getByRole("link", { name: "MusicBrainz" })).toHaveAttribute(
      "href",
      "https://musicbrainz.org/recording/22222222-2222-2222-2222-222222222222",
    );
  });

  it("selects a genre from the lineage in the tree", () => {
    useSongMock.mockReturnValue({ status: "success", song });
    const onSelectGenre = vi.fn();
    render(<Harness uuid={UUID} onSelectGenre={onSelectGenre} />);

    fireEvent.click(screen.getByRole("button", { name: "Rock" }));

    expect(onSelectGenre).toHaveBeenCalledWith(rock);
  });

  it("shows a song without a genre as having none", () => {
    useSongMock.mockReturnValue({ status: "success", song: { ...song, genre: null } });
    render(<Harness uuid={UUID} genrePath={[]} />);

    expect(screen.getByText("No genre")).toBeInTheDocument();
  });

  it("plays the song, or pauses it when it is the current track", () => {
    useSongMock.mockReturnValue({ status: "success", song });
    render(<Harness uuid={UUID} />);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(playNewTrackListFromTrackUuidMock).toHaveBeenCalledWith(song, "me");

    cleanup();
    playerState.value = { playerTrackObject: { track: { id: UUID } }, playState: "PLAYING" };
    render(<Harness uuid={UUID} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(handlePlayPauseActionMock).toHaveBeenCalled();
  });

  it("explains why an unplayable song has no Play button", () => {
    useSongMock.mockReturnValue({
      status: "success",
      song: { ...song, youtubeVideo: { id: "vid", unplayableReason: "private", viewCount: null } },
    });
    render(<Harness uuid={UUID} />);

    expect(screen.queryByRole("button", { name: "Play" })).not.toBeInTheDocument();
    expect(screen.getByText("Private video")).toBeInTheDocument();
  });
});
