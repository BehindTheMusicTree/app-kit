import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GenreSearch from "./GenreSearch";
import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";

const makeGenrePlaylist = (name: string): CriteriaPlaylistSimple => ({
  uuid: name,
  name,
  criteria: null,
  parent: null,
  root: { uuid: "root", name: "root" },
  tracksCount: 0,
  createdOn: "2026-01-01T00:00:00Z",
  updatedOn: null,
});

describe("GenreSearch", () => {
  const genrePlaylists = [makeGenrePlaylist("Deep House"), makeGenrePlaylist("Ambient")];

  it("renders no results before typing", () => {
    render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows matching results as the user types", () => {
    render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hou" } });

    expect(screen.getByText("Deep House")).toBeInTheDocument();
    expect(screen.queryByText("Ambient")).not.toBeInTheDocument();
  });

  it("calls onSelect with the matching genre playlist when a result is clicked", () => {
    const onSelect = vi.fn();
    render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={onSelect} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "amb" } });
    fireEvent.click(screen.getByText("Ambient"));

    expect(onSelect).toHaveBeenCalledWith(genrePlaylists[1]);
  });

  it("clears the query and results after a selection", () => {
    render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "amb" } });
    fireEvent.click(screen.getByText("Ambient"));

    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.queryByText("Ambient")).not.toBeInTheDocument();
  });
});
